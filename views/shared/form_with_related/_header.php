<? 

/*
This partial is used to open forms that have a related data sidebar

	- title: The title of this page
	
	- controller : A string depicting the controller.  This is used in
		generating links.  I.e. 'admin.news'
		
	- item (optional) : The data that is being edited
	
	- parent_id (optional) : The id of the parent row of the model
	  that is the parent of what is being edited.  If news has mas 
	  many photos and this form is for photos, it is the id of the
	  associated news article
	  
	- description (optiona) : A description for the view


*/

?>

<h1><?=$title?>
	<? if(!empty($item)): ?>
		<a href="<?=route($controller.'@new', !empty($parent_id)?array($parent_id):array())?>" class="btn btn-info pull-right"><i class="icon-plus icon-white"></i> New</a>
	<? endif ?>
	<? if (!empty($description)):?>
		<small><?=$description?></small>
	<? endif ?>
</h1>

<?// Show validation errors?>
<?=render('decoy::shared.form._errors')?>

<div class="row">
	<div class="span6">
		<?= Former::vertical_open_for_files() ?>
			<?= Form::token() ?>
		
			<legend><?=empty($item)?'New':'Edit'?></legend>