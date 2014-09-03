<?php namespace Bkwld\Decoy\Models;

// Dependencies
use Config;
use Request;
use HtmlObject\Element;

/**
 * Stores the status of an encoding job and the converted outputs.
 * It was designed to handle the conversion of video files to
 * HTML5 formats with Zencoder but should be abstract enough to 
 * support other types of encodings.
 */
class Encoding extends Base {

	/**
	 * Comprehensive list of states
	 */
	static private $states = array(
		'error',      // Any type of error
		'pending',    // No response from encoder yet
		'queued',     // The encoder API has been hit
		'processing', // Encoding has started
		'complete',   // Encode is finished
		'cancelled',  // The user has canceled the encode
	);

	/**
	 * Polymorphic relationship definition
	 *
	 * @return \Illuminate\Database\Eloquent\Relations\MorphTo
	 */
	public function encodable() { return $this->morphTo(); }

	/**
	 * Return an assoc array for output to JSON when admin asks
	 * for progress on an encode
	 *
	 * @return Bkwld\Decoy\Models\Encoding
	 */
	public function forProgress() {
		$this->setVisible(array('status', 'message', 'admin_player', 'progress'));
		$this->setAppends(array('admin_player', 'progress'));
		return $this;
	}

	/**
	 * Set default fields and delete any old encodings for the same source.
	 *
	 * @return void 
	 */
	public function onCreating() {

		// Delete any other encoding jobs for the same parent and field
		self::where('encodable_type', '=', $this->encodable_type)
			->where('encodable_id', '=', $this->encodable_id)
			->where('encodable_attribute', '=', $this->encodable_attribute)
			->delete();

		// Default values
		$this->status = 'pending';
		
	}

	/**
	 * Once the model is created, try to encode it.  This is done during
	 * the created callback so we can we call save() on the record without
	 * triggering an infitie loop like can happen if one tries to save while
	 * saving
	 *
	 * @return void 
	 */
	public function onCreated() {
		static::encoder($this)->encode($this->source());
	}

	/**
	 * Delete encoded files that are local to this filesystem
	 */
	public function onDeleted() {

		// Get the sources
		if (!$sources = $this->outputs) return;
		$sources = json_decode($sources);

		// Loop through the sources and try to delete them
		foreach($sources as $source) {
			if (preg_match('#^/#', $source) && file_exists(public_path().$source)) {
				unlink(public_path().$source);
			}
		}
	}

	/**
	 * Make an instance of the encoding provider
	 *
	 * @param array $input Input::get()
	 * @return mixed Reponse to the API
	 */
	static public function notify($input) {
		return static::encoder()->handleNotification($input);
	}

	/**
	 * Get an instance of the configured encoding provider
	 *
	 * @param Bkwld\Decoy\Models\Encoding
	 * @return Bkwld\Decoy\Input\EncodingProviders\EncodingProvider
	 */
	static public function encoder(Encoding $model = null) {
		$class = Config::get('decoy::encode.provider');
		return new $class($model);
	}

	/**
	 * Get the source video for the encode
	 *
	 * @return string The path to the video relative to the 
	 *                document root
	 */
	public function source() {
		$val = $this->encodable->{$this->encodable_attribute};
		if (preg_match('#^http#', $val)) return $val;
		else return Request::root().$val;
	}

	/**
	 * Store a record of the encoding job
	 *
	 * @param string $job_id A unique id generated by the service
	 * @param mixed $outputs An optional assoc array where the keys are 
	 *                       labels for the outputs and the values are 
	 *                       absolute paths of where the output will be saved
	 * @return void 
	 */
	public function storeJob($job_id, $outputs = null) {
		$this->status = 'queued';
		$this->job_id = $job_id;
		$this->outputs = json_encode($outputs);
		$this->save();
	}

	/**
	 * Update the status of the encode
	 *
	 * @param  string status 
	 * @param  string $message
	 * @return void  
	 */
	public function status($status, $message = null) {
		if (!in_array($status, static::$states)) throw new Exception('Unknown state: '.$status);

		// If the current status is complete, don't update again.  I have seen cases of a late
		// processing call on a HLS stream file after it's already been set to complete.  I think
		// it could just be weird internet delays.
		if ($this->complete == 'complete') return;

		// Append messages
		if ($this->message) $this->message .= ' ';
		if ($message) $this->message .= $message;

		// If a job is errored, don't unset it.  Thus, if one output fails, a notification
		// from a later output succeeding still means an overall failure.
		if ($this->status != 'error') $this->status = $status;

		// Save it
		$this->save();
	}

	/**
	 * Generate an HTML5 video tag with extra elements for displaying in the admin
	 *
	 * @return string
	 */
	public function getAdminPlayerAttribute() {
		if (!$tag = $this->getTagAttribute()) return;
		return $tag
			->addClass('img-polaroid')
			->controls()
			->width(580) // Matches the default width of image field preview
			->render()
		;
	}

	/**
	 * Get the progress percentage of the encode
	 *
	 * @return int 0-100
	 */
	public function getProgressAttribute() {
		switch($this->status) {
			case 'pending': return 0;
			case 'queued': return (static::encoder($this)->progress()/100*25) + 25;
			case 'processing': return (static::encoder($this)->progress()/100*50) + 50;
		}
	}

	/**
	 * Generate an HTML5 video tag via Former's HtmlObject for the outputs
	 *
	 * @return HtmlObject\Element
	 */
	public function getTagAttribute() {

		// Require sources and for the encoding to be complete
		if (!($sources = $this->outputs) || $this->status != 'complete') return;
		$sources = json_decode($sources);

		// Start the tag
		$tag = Element::video();
		$tag->value('Your browser does not support the video tag. You should <a href="http://whatbrowser.org/">consider updating</a>.');

		// Loop through the outputs and add them as sources
		$types = array('mp4', 'webm', 'ogg', 'playlist');
		foreach($sources as $type => $src) {

			// Only allow basic output types
			if (!in_array($type, $types)) continue;

			// Make the source
			$source = Element::source()->src($src);
			if ($type == 'playlist') $source->type('application/x-mpegurl');
			else $source->type('video/'.$type);

			// Add a source to the video tag
			$tag->appendChild($source);
		}

		// Return the tag
		return $tag;
	}

}