var choice=-1;
var pathChoosen="";
var typedName="";

var userPreferences="";
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

var filename = undefined;
if(getParameterByName('filename')!=null)
filename = getParameterByName('filename');

var filecontents=undefined;

var user = undefined;
if(getParameterByName('user')!=null)
user=getParameterByName('user');

var dir = undefined;
if(getParameterByName('dir')!=null)
dir = getParameterByName('dir');    

 
 
function showStatus(message, type) {

    $('.status').removeClass('info error success').addClass(type).html(message);
    $('#statusbar-container').dequeue().addClass('active').delay(3000).queue(function() {
        $(this).removeClass('active');
    });
};

var ajaxTemplate;

function convertImgToBase64URL(url, callback, outputFormat){
    var img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function(){
        var canvas = document.createElement('CANVAS'),
        ctx = canvas.getContext('2d'), dataURL;
        canvas.height = this.height;
        canvas.width = this.width;
        ctx.drawImage(this, 0, 0);
        dataURL = canvas.toDataURL(outputFormat);
        callback(dataURL);
        canvas = null; 
    };
    img.src = url;
}





var Rappid = Backbone.Router.extend({

    routes: {
        '*path': 'home'
    },
   
    
    	
    initialize: function(options) {
        
        this.options = options || {};
    },

    home: function() {

        this.initializeEditor();
    },

    initializeEditor: function() {

        this.inspectorClosedGroups = {};

        this.initializePaper();
       this.initializeAjaxRequests();
      this.initializeStencil();
        this.initializeSelection();
        this.initializeHaloAndInspector();
        this.initializeNavigator();
        this.initializeClipboard();
        this.initializeCommandManager();
        this.initializeToolbar();
        // Intentionally commented out. See the `initializeValidator()` method for reasons.
        // Uncomment for demo purposes.
        this.initializeValidator();
        // Commented out by default. You need to run `node channelHub.js` in order to make
        // channels working. See the documentation to the joint.com.Channel plugin for details.
        //this.initializeChannel('ws://jointjs.com:4141');
        if (this.options.channelUrl) {
            this.initializeChannel(this.options.channelUrl);
        }
    },

    // Create a graph, paper and wrap the paper in a PaperScroller.
    initializePaper: function() {
    	
    	
   	$.get( "./forms/model", function( data ) {
    		  ajaxTemplate=data;
    		 
    		});
    
    
			
    	
 
        this.graph = new joint.dia.Graph;

        this.graph.on('add', function(cell, collection, opt) {
            if (opt.stencil) {
                this.createInspector(cell);
                this.commandManager.stopListening();
                this.inspector.updateCell();
                this.commandManager.listen();
                this.inspector.$('[data-attribute]:first').focus();
            }
        }, this);

        this.paper = new joint.dia.Paper({
            width: 1000,
            height: 1000,
            gridSize: 10,
            perpendicularLinks: true,
            model: this.graph,
            defaultLink: new joint.dia.Link({
                attrs: {
                    // @TODO: scale(0) fails in Firefox
                    '.marker-source': { d: 'M 10 0 L 0 5 L 10 10 z', transform: 'scale(0.001)' },
                    '.marker-target': { d: 'M 10 0 L 0 5 L 10 10 z' },
                    '.connection': {
                        stroke: 'black'
                        // filter: { name: 'dropShadow', args: { dx: 1, dy: 1, blur: 2 } }
                    }
                }
            })
        });

        this.paperScroller = new joint.ui.PaperScroller({
            autoResizePaper: true,
            padding: 50,
            paper: this.paper
        });

        this.paperScroller.$el.appendTo('.paper-container');

        this.paperScroller.center();

        this.graph.on('add', this.initializeLinkTooltips, this);

        $('.paper-scroller').on('mousewheel DOMMouseScroll', _.bind(function(evt) {

            if (_.contains(KeyboardJS.activeKeys(), 'alt')) {
                evt.preventDefault();
                var delta = Math.max(-1, Math.min(1, (evt.originalEvent.wheelDelta || -evt.originalEvent.detail)));
	        var offset = this.paperScroller.$el.offset();
	        var o = this.paperScroller.toLocalPoint(evt.pageX - offset.left, evt.pageY - offset.top);
                this.paperScroller.zoom(delta / 10, { min: 0.2, max: 5, ox: o.x, oy: o.y });
            }

        }, this));

        this.snapLines = new joint.ui.Snaplines({ paper: this.paper });
        
   
    
		
      $.ajax({
         url:    owncloudserverLink+'/index.php/apps/WGEPlugin/ajax/filecontents.php' 
                  
                  + '?file=' + filename + '&dir='+ dir +'&user='+ user,
         success: function(result) {


                   filecontents=result.data.filecontents;
                  },
                  
                
         async:   false
    }); 
      
    
       

		if(filecontents!=undefined && filecontents!="")
			{
	this.graph.fromJSON(jQuery.parseJSON(filecontents));	    
   
			
			}
    
    },

    initializeLinkTooltips: function(cell) {

        if (cell instanceof joint.dia.Link) {

            var linkView = this.paper.findViewByModel(cell);
            new joint.ui.Tooltip({
                className: 'tooltip small',
                target: linkView.$('.tool-options'),
                content: 'Click to open Inspector for this link',
                left: linkView.$('.tool-options'),
                direction: 'left'
            });
        }
    },

    // Create and populate stencil.
    initializeStencil: function() {
    	
    	

        this.stencil = new joint.ui.Stencil({
            graph: this.graph,
            paper: this.paper,
            width: 240,
            groups: Stencil.groups,
            search: {
                '*': ['type','attrs/text/text','attrs/.label/text'],
                'org.Member': ['attrs/.rank/text','attrs/.name/text']
            }
        });

        $('.stencil-container').append(this.stencil.render().el);

        this.stencil.$el.on('contextmenu', function(evt) { evt.preventDefault(); });
        $('.stencil-paper-drag').on('contextmenu', function(evt) { evt.preventDefault(); });

        var layoutOptions = {
            columnWidth: this.stencil.options.width / 2 - 10,
            columns: 2,
            rowHeight: 80,
            resizeToFit: true,
            dy: 10,
            dx: 10
        };

        _.each(Stencil.groups, function(group, name) {
            
            this.stencil.load(Stencil.shapes[name], name);
            joint.layout.GridLayout.layout(this.stencil.getGraph(name), layoutOptions);
            this.stencil.getPaper(name).fitToContent(1, 1, 10);

        }, this);

        this.stencil.on('filter', function(graph) {
            joint.layout.GridLayout.layout(graph, layoutOptions);
        });

        $('.stencil-container .btn-expand').on('click', _.bind(this.stencil.openGroups, this.stencil));
        $('.stencil-container .btn-collapse').on('click', _.bind(this.stencil.closeGroups, this.stencil));

        this.initializeStencilTooltips();
    },

    initializeStencilTooltips: function() {

        // Create tooltips for all the shapes in stencil.
        _.each(this.stencil.graphs, function(graph) {

            graph.get('cells').each(function(cell) {
            	var content="";
            	if(cell.get('custom').classifier[1])
            		content =cell.get('attrs').text.name+"\n"+cell.get('custom').classifier[1].URI;


                new joint.ui.Tooltip({
                    target: '.stencil [model-id="' + cell.id + '"]',
                    content: content,
                    left: '.stencil',
                    direction: 'left'
                });
            });
        });
    },

    initializeSelection: function() {
    	
        this.selection = new Backbone.Collection;
        this.selectionView = new joint.ui.SelectionView({ paper: this.paper, graph: this.graph, model: this.selection });

        // Initiate selecting when the user grabs the blank area of the paper while the Shift key is pressed.
        // Otherwise, initiate paper pan.
        this.paper.on('blank:pointerdown', function(evt, x, y) {

            if (_.contains(KeyboardJS.activeKeys(), 'shift')) {
                this.selectionView.startSelecting(evt, x, y);
            } else {
                this.selectionView.cancelSelection();
                this.paperScroller.startPanning(evt, x, y);
            }
        }, this);

        this.paper.on('cell:pointerdown', function(cellView, evt) {
            // Select an element if CTRL/Meta key is pressed while the element is clicked.
            if ((evt.ctrlKey || evt.metaKey) && !(cellView.model instanceof joint.dia.Link)) {
                this.selection.add(cellView.model);
                this.selectionView.createSelectionBox(cellView);
            }
        }, this);

        this.selectionView.on('selection-box:pointerdown', function(evt) {
            // Unselect an element if the CTRL/Meta key is pressed while a selected element is clicked.
            if (evt.ctrlKey || evt.metaKey) {
                var cell = this.selection.get($(evt.target).data('model'));
                this.selection.reset(this.selection.without(cell));
                this.selectionView.destroySelectionBox(this.paper.findViewByModel(cell));
            }
        }, this);

        // Disable context menu inside the paper.
        // This prevents from context menu being shown when selecting individual elements with Ctrl in OS X.
        this.paper.el.oncontextmenu = function(evt) { evt.preventDefault(); };

        KeyboardJS.on('delete, backspace', _.bind(function(evt, keys) {

            if (!$.contains(evt.target, this.paper.el)) {
                // remove selected elements from the paper only if the target is the paper
                return;
            }

            this.commandManager.initBatchCommand();
            this.selection.invoke('remove');
            this.commandManager.storeBatchCommand();
            this.selectionView.cancelSelection();

            // Prevent Backspace from navigating one page back (happens in FF).
            if (_.contains(keys, 'backspace') && !$(evt.target).is("input, textarea")) {

                evt.preventDefault();            }

        }, this));
    },

    createInspector: function(cellView) {

        var cell = cellView.model || cellView;

        // No need to re-render inspector if the cellView didn't change.
        if (!this.inspector || this.inspector.options.cell !== cell) {
            
            if (this.inspector) {

                this.inspectorClosedGroups[this.inspector.options.cell.id] = _.map(app.inspector.$('.group.closed'), function(g) {
		    return $(g).attr('data-name');
		});
                
                // Clean up the old inspector if there was one.
                this.inspector.updateCell();
                this.inspector.remove();
            }

            var inspectorDefs = InspectorDefs[cell.get('type')];
            	
            this.inspector = new joint.ui.Inspector({
                inputs: inspectorDefs ? inspectorDefs.inputs : CommonInspectorInputs,
                groups: inspectorDefs ? inspectorDefs.groups : CommonInspectorGroups,
                cell: cell
            });

            this.initializeInspectorTooltips();
            
            this.inspector.render();
            $('.inspector-container').html(this.inspector.el);

            if (this.inspectorClosedGroups[cell.id]) {

		_.each(this.inspectorClosedGroups[cell.id], this.inspector.closeGroup, this.inspector);

            } else {
                this.inspector.$('.group:not(:first-child)').addClass('closed');
            }
        }
    },

    initializeInspectorTooltips: function() {
        
        this.inspector.on('render', function() {

            this.inspector.$('[data-tooltip]').each(function() {

                var $label = $(this);
                new joint.ui.Tooltip({
                    target: $label,
                    content: $label.data('tooltip'),
                    right: '.inspector',
                    direction: 'right'
                });
            });
            
        }, this);
    },

    initializeHaloAndInspector: function() {

        this.paper.on('cell:pointerup', function(cellView, evt) {

            if (cellView.model instanceof joint.dia.Link || this.selection.contains(cellView.model)) return;

            // In order to display halo link magnets on top of the freetransform div we have to create the
            // freetransform first. This is necessary for IE9+ where pointer-events don't work and we wouldn't
            // be able to access magnets hidden behind the div.
            var freetransform = new joint.ui.FreeTransform({ graph: this.graph, paper: this.paper, cell: cellView.model });
            var halo = new joint.ui.Halo({ graph: this.graph, paper: this.paper, cellView: cellView });

            // As we're using the FreeTransform plugin, there is no need for an extra resize tool in Halo.
            // Therefore, remove the resize tool handle and reposition the clone tool handle to make the
            // handles nicely spread around the elements.
            halo.removeHandle('resize');
            halo.changeHandle('clone', { position: 'se' });
            
            freetransform.render();
            halo.render();

            this.initializeHaloTooltips(halo);

            this.createInspector(cellView);

            this.selectionView.cancelSelection();
            this.selection.reset([cellView.model]);
            
        }, this);

        this.paper.on('link:options', function(evt, cellView, x, y) {

            this.createInspector(cellView);
        }, this);
    },

    initializeNavigator: function() {

        var navigator = this.navigator = new joint.ui.Navigator({
            width: 240,
            height: 115,
            paperScroller: this.paperScroller,
            zoomOptions: { max: 5, min: 0.2 }
        });

        navigator.$el.appendTo('.navigator-container');
        navigator.render();
    },

    initializeHaloTooltips: function(halo) {

        new joint.ui.Tooltip({
            className: 'tooltip small',
            target: halo.$('.remove'),
            content: 'Click to remove the object',
            direction: 'right',
            right: halo.$('.remove'),
            padding: 15
        });
        new joint.ui.Tooltip({
            className: 'tooltip small',
            target: halo.$('.fork'),
            content: 'Click and drag to clone and connect the object in one go',
            direction: 'left',
            left: halo.$('.fork'),
            padding: 15
        });
        new joint.ui.Tooltip({
            className: 'tooltip small',
            target: halo.$('.clone'),
            content: 'Click and drag to clone the object',
            direction: 'left',
            left: halo.$('.clone'),
            padding: 15
        });
        new joint.ui.Tooltip({
            className: 'tooltip small',
            target: halo.$('.unlink'),
            content: 'Click to break all connections to other objects',
            direction: 'right',
            right: halo.$('.unlink'),
            padding: 15
        });
        new joint.ui.Tooltip({
            className: 'tooltip small',
            target: halo.$('.link'),
            content: 'Click and drag to connect the object',
            direction: 'left',
            left: halo.$('.link'),
            padding: 15
        });
        
        new joint.ui.Tooltip({
            className: 'tooltip small',
            target: halo.$('.rotate'),
            content: 'Click and drag to rotate the object',
            direction: 'right',
            right: halo.$('.rotate'),
            padding: 15
        });
    },

    initializeClipboard: function() {

        this.clipboard = new joint.ui.Clipboard;
        
        KeyboardJS.on('ctrl + c', _.bind(function() {
            // Copy all selected elements and their associated links.
            this.clipboard.copyElements(this.selection, this.graph, { translate: { dx: 20, dy: 20 }, useLocalStorage: true });
        }, this));
        
        KeyboardJS.on('ctrl + v', _.bind(function() {

            this.selectionView.cancelSelection();

            this.clipboard.pasteCells(this.graph, { link: { z: -1 }, useLocalStorage: true });

            // Make sure pasted elements get selected immediately. This makes the UX better as
            // the user can immediately manipulate the pasted elements.
            this.clipboard.each(function(cell) {

                if (cell.get('type') === 'link') return;

                // Push to the selection not to the model from the clipboard but put the model into the graph.
                // Note that they are different models. There is no views associated with the models
                // in clipboard.
                this.selection.add(this.graph.getCell(cell.id));
		this.selectionView.createSelectionBox(cell.findView(this.paper));

            }, this);

        }, this));

        KeyboardJS.on('ctrl + x', _.bind(function() {

            var originalCells = this.clipboard.copyElements(this.selection, this.graph, { useLocalStorage: true });
            this.commandManager.initBatchCommand();
            _.invoke(originalCells, 'remove');
            this.commandManager.storeBatchCommand();
            this.selectionView.cancelSelection();
        }, this));
    },

    initializeCommandManager: function() {

        this.commandManager = new joint.dia.CommandManager({ graph: this.graph });

        KeyboardJS.on('ctrl + z', _.bind(function() {

            this.commandManager.undo();
            this.selectionView.cancelSelection();
        }, this));
        
        KeyboardJS.on('ctrl + y', _.bind(function() {

            this.commandManager.redo();
            this.selectionView.cancelSelection();
        }, this));
    },

    initializeValidator: function() {

        // This is just for demo purposes. Every application has its own validation rules or no validation
        // rules at all.
        
        this.validator = new joint.dia.Validator({ commandManager: this.commandManager });
        
        

     this.validator.validate('change:source change:target add', _.bind(function(err, command, next) {
        	 var loops = false //link loops allowed / denied
             , paperPin = true //allow link to pin to paper
             , type = 'type' // attribute name in the cell the rules working with
            	
        	
        	
        	
            	  
           var link = command.data.attributes || this.graph.getCell(command.data.id).toJSON();
        	 console.log(link)
        	 if(link.type!='link' && link.type!='basic.Sensor' && link.type!='basic.Platform' )
     		{ 
        		 
        		 
        		 joint.dia.Cell.prototype.prop.call(this.graph.getCell(link.id),"attrs/text/text", link.custom.classifier[0].URI, undefined);
     		
     		
     		
     		/*var resultClass = $.grep(link.custom.classifier, function(e){return (e.Ref=="modelData") });
     	
     		for( var i in resultClass)
 			{
     			$( "input[value="+resultClass[i].name+"]" ).prop('disabled', true);
 				$( "input[value="+resultClass[i].name+"]" ).css({'background-color' : '#D4D0C8'});

     			$( "input[value="+resultClass[i].URI+"]" ).prop('disabled', true);
     			$( "input[value="+resultClass[i].URI+"]" ).css({'background-color' : '#D4D0C8'});
 			
 			
 			}*/
 			  
     		}
     
       
        	// this.graph.getCell(link).attr("text").fill="#000000"
        	 
           
        	 console.log( this.graph.getCell(link).attr("text"));
        	 if(link.type !='link')
     		{
     		 
        		 this.graph.getCell(link.id).get('uuid').push(link.id);

        		this.graph.getCell(link.id);
     		}
           
           if(link.type=='link')
        	  {
        	   
        	  
           var sourceId = link.source.id
             , targetId = link.target.id;

        
           if (sourceId && targetId) {

       	      
        	this.graph.getCell(targetId).get('ref').push(sourceId);
        	this.graph.getCell(targetId).get('ref');
        	this.graph.getCell(targetId);
        	
       	
       	   
       		}
     
           
           return next();
        }
        	  }  , this));
     
   
      
    this.validator.validate('change:source change:target remove', _.bind(function(err, command, next) {
    	 var loops = false //link loops allowed / denied
         , paperPin = true //allow link to pin to paper
         , type = 'type' // attribute name in the cell the rules working with
      
       
        	 if (this.graph.getCell(command.data.id) ==undefined)
        		 {
        		 
        		 
       var link = command.data.attributes || this.graph.getCell(command.data.id).toJSON();
      
       if(link.type=='link')
    	  {
    	   
       var sourceId = link.source.id
         , targetId = link.target.id;

    
       if (sourceId && targetId) {

    	   		
   	

   		if(this.graph.getCell(targetId)!=undefined)
   		this.graph.getCell(targetId).get('ref').splice(this.graph.getCell(targetId).get('ref').indexOf(sourceId),1);
    	
   		}
 
    
      
    }
    	  }} , this));
        
   

        this.validator.on('invalid',function(message) {
            
        
        });
    },
    toJSON: function() {

  	  var windowFeatures = 'menubar=no,location=no,resizable=yes,scrollbars=yes,status=no';
  	  var windowName = _.uniqueId('json_output');
  	  var jsonWindow = window.open('', windowName, windowFeatures);

  	  jsonWindow.document.write(JSON.stringify(this.graph.toJSON()));
  	},


  	
    initializeToolbar: function() {

        this.initializeToolbarTooltips();
        
        $('#btn-undo').on('click', _.bind(this.commandManager.undo, this.commandManager));
        $('#btn-redo').on('click', _.bind(this.commandManager.redo, this.commandManager));
        
       
       
        $('#btn-zoom-in').on('click', _.bind(function() { this.paperScroller.zoom(0.2, { max: 5, grid: 0.2 }); }, this));
        $('#btn-zoom-out').on('click', _.bind(function() { this.paperScroller.zoom(-0.2, { min: 0.2, grid: 0.2 }); }, this));
        $( "li.sensorml" ).on('click', _.bind(function() {
        	
        	
        
        		console.log(InspectorDefs)
        	var zip = new JSZip();
        	var name = document.getElementById('fileName').value;
        	
        	var model = this.graph.toJSON();
        	
    
        	for (var i in model.cells)
        	{
        		
            	console.log(model.cells[i])
        		if( model.cells[i].type!="link"   )
        			{
        			
        		var elem = model.cells[i].id;
        		if(this.graph.getCell(elem).attr('text').text=='' ) 
        			{
        		this.graph.getCell(elem).attr('text').text="UNNAMEDElement"+i;
        		model.cells[i].attrs.text.text="UNNAMEDElement"+i;
        		//console.log("namme"+model.cells[i].attrs.text.text);
        		
        			}
        		for (var j in model.cells[i].ref)
    			{
        			var ref = model.cells[i].ref[j];
        			
        			if(this.graph.getCell(ref)!=null)
        			model.cells[i].ref[j]=this.graph.getCell(ref).attr('text').text;
        			//console.log("ref"+model.cells[i].ref[j]);
    		
    			}
        		
        		
        		
        		
        			}
        				 			
        			
        	}
        	
        	for (var i in model.cells) { 
        		
        		if( model.cells[i].type!="link")
        		{	
        			
        			model.cells[i].modelType="plop";
        			if( model.cells[i].modelType=model.cells[i].custom.classifier[0] && model.cells[i].custom.classifier[0].name==="model")
            		
        					model.cells[i].modelType=model.cells[i].custom.classifier[0].URI;
        			
        		
        		model.cells[i].custom.classifier = model.cells[i].custom.classifier.filter(function (el) {
                    return el.Ref !== "modelData";
                   });
        		
        		
        			var template = Handlebars.compile(ajaxTemplate);
        			var generated = template(model.cells[i]);
        			
        			        			//console.log(generated); 
        			var generatedDecode = $('<textarea />').html(generated).text();
                	
                	zip.file(model.cells[i].attrs.text.text+".xml", generatedDecode);
        			
        		}
        	
        	}
        	


    	
    	var content = zip.generate({type:"blob"});
    	saveAs(content, name+".zip"); }, this));
      $( "li.png" ).on('click', _.bind(this.paper.openAsPNG, this.paper));
      $( "#fileInput" ).on('click', _.bind(function () {
    	 
    		var graph= this;
    	  var fileInput = document.getElementById('fileInput');
    	
		fileInput.addEventListener('change', function(e) {
			var file = fileInput.files[0];
			
			var parts = file.name.split(".");
			if(parts[1]=="moe")
				{
				
		
				console.log("1.5");
				var reader = new FileReader();
				
				reader.onload = function(e) {
					console.log("2");
					graph.fromJSON(jQuery.parseJSON(reader.result));
					
				}

				reader.readAsText(file);	
				
				
				}
			
		});}, this.graph));
      $( "li.todevice" ).on('click', _.bind(function() {
    	  
    	  var zip = new JSZip();
    	var name = document.getElementById('fileName').value;
    	zip.file(name+".moe", JSON.stringify(this.graph.toJSON()));
    	var content = zip.generate({type:"blob"});
    	saveAs(content, name+".zip");
    	}, this));
      $( "li.svg" ).on('click', _.bind(this.paper.openAsSVG, this.paper));
      $( "li.new" ).on('click', _.bind(this.graph.clear, this.graph));
      $( '#btn-clear' ).on('click', _.bind(this.graph.clear, this.graph));
      
        $('#btn-zoom-to-fit').on('click', _.bind(function() {
            this.paperScroller.zoomToFit({
                padding: 20,
                scaleGrid: 0.2,
                minScale: 0.2,
                maxScale: 5
            });
        }, this));
        $('#btn-fullscreen').on('click', _.bind(this.toggleFullscreen, this));
        $('#btn-print').on('click', _.bind(this.paper.print, this.paper));
        $('#btn-exportJSON').on('click', _.bind(this.toJSON, this));
        $('li.odt').on('click', _.bind(function() { 
        	var model = this.graph.toJSON();
        	console.log(model.cells);
        	for ( var i=0; i<model.cells.length;i++)
        		{
        		if(model.cells[i].type=='link')
        			{
        			console.log(model.cells[i]);
        			model.cells.splice(i,1);
        			
        			console.log(i);
        			i--;
        			}
        		
        	
        		
        		}
        	
        	for ( var i=0; i<model.cells.length;i++)
    		{
        		console.log(model.cells[i].attrs.image["xlink:href"])
    		var imageExtension=model.cells[i].attrs.image["xlink:href"];
    		imageExtension=imageExtension.split(".");
    	if( imageExtension[1]==="png")
    		{
    		
    		convertImgToBase64URL(model.cells[i].attrs.image["xlink:href"], function(base64Img){
    		    // Base64DataURL
    			console.log(base64Img)
    		});
    		
    		}
    		
    		}
        	
        	
        	for (var i in model.cells)
        	{
        		
            	console.log(model.cells[i])
        		if( model.cells[i].type!="link"   )
        			{
        			
        		var elem = model.cells[i].id;
        		if(this.graph.getCell(elem).attr('text').text=='' ) 
        			{
        		this.graph.getCell(elem).attr('text').text="UNNAMEDElement"+i;
        		model.cells[i].attrs.text.text="UNNAMEDElement"+i;
        		//console.log("namme"+model.cells[i].attrs.text.text);
        		
        			}
        		for (var j in model.cells[i].ref)
    			{
        			var ref = model.cells[i].ref[j];
        			
        			if(this.graph.getCell(ref)!=null)
        			model.cells[i].ref[j]=this.graph.getCell(ref).attr('text').text;
        			//console.log("ref"+model.cells[i].ref[j]);
    		
    			}
        		
        		
        		
        		
        			}
        				 			
        			
        	}
        	
        	model = JSON.stringify(model);
        	
        	 var callback= function (dataURL){  
        		 
        		 var overallImage =dataURL.split(",");
        		
        		 
             				$("#json").val(model);
             				$("#projectName").val($("#fileName").val());
             				$("#overallImage").val(overallImage[1]);
             				$('#birtForm').attr("action", birtserverLink);
             				$('#birtForm').submit();             				
             				
             			console.log($('#birtForm'));	
             			
             				
        	 
        	 }
        	
        	
        	 this.paper.toPNG(callback) ;
        	  
       
        
        				
        
        	
        
        }, this));
        $("li.toowncloud").on('click', _.bind(function() {
	var model =this.graph.toJSON();
            
            var toImport = []; 
            
            
            $.each(model.cells, function(i, v) {
          	 if(v.type!="link")
          		 {
          	   if(v.custom.imported)
          		   {
          		  
          	  toImport.push(v);
          		   } }
          	    
          	});
          	
            	
                     	
          	var graphicData=JSON.stringify(this.graph.toJSON());
          	var pathChoosen="";
          	var typedName="";
          	$("#dialog-box").dialog({
          	    autoOpen: false,
          	    modal: true,
          	    height: 200,
          	    width: 600,
          	    	
          	      buttons: {
          	        Save: function() {
          	        	
          	        	pathChoosen=  owncloudserverLink+"/remote.php/webdav";
          	        	typedName=$('#filenameTyped').val();
          	 
          	        	$.ajax({
          	        	    url: pathChoosen+'/'+typedName,
          	        	    type: 'PUT',
          	        	  
          	        	xhrFields: {
          	        	       withCredentials: true
          	        	    },
          	        	    crossDomain: true,
          	        	    data: graphicData, // or $('#myform').serializeArray()
          	        	    success: function() { }
          	        	});
          	        	for (var i in toImport) { 
          	        		if(userPreferences!=="")
          	        		userPreferences=userPreferences+";"+toImport[i].attrs.text.text+".moe";
          	        		else
          	        		userPreferences=toImport[i].attrs.text.text+".moe";
          	        		console.log(userPreferences);
          	        		$.ajax({
          	        			
          		        	    url: owncloudserverLink+'/remote.php/webdav/'+toImport[i].attrs.text.text+".moe",
          		        	    type: 'PUT',
          		        	  xhrFields: {
          		        	       withCredentials: true
          		        	    },
          		        	    crossDomain: true,
          		        	    data: JSON.stringify({"cells":[toImport[i]]}), // or $('#myform').serializeArray()
          		        	    success: function() { }
          		        	});
          	        		
          	    			
          	    		}
          	        	
          	        	$.ajax({
          	        	    url: owncloudserverLink+'/remote.php/webdav/'+".sensorNannyDraw",
          	        	    type: 'PUT',
          	        	  xhrFields: {
          	        	       withCredentials: true
          	        	    },
          	        	    crossDomain: true,
          	        	    data: userPreferences, // or $('#myform').serializeArray()
          	        	    success: function() { 
          	        	    	
          	        	    
          	        	    	
          	        	    }
          	        	});
          	    		
          	          $( this ).dialog( "close" );
          	          
          	        }
          	      },
          	    open: function(ev, ui){
          	             $('#myIframe').attr('src',owncloudserverLink+'/remote.php/webdav');
          	          }
          	});


          	    $('#dialog-box').dialog('open');
        },this));
        
        
        
        $("li.save").on('click', _.bind(function() {
        	
        	if(choice==-1) 
     	   {
     	   
     	   
     	   
         	    $( "#dialog-choice" ).dialog({
         	      modal: true,
         	      buttons: {
         	        Device: function() {
         	        	choice=0;
         	        	 
         	          $( this ).dialog( "close" );
         	          $( "li.save" ).trigger( "click" );
         	        },
         	        Owncloud :function() {
         	        	choice=1;
         	        	$( this ).dialog( "close" );
         	        	$( "li.save" ).trigger( "click" );
         	        	
         	        }
         	      }
         	    });
         	 
     	   }
         	
         	
         	var model =this.graph.toJSON();
   
   var toImport = []; 
   
   
   $.each(model.cells, function(i, v) {
 	 if(v.type!="link")
 		 {
 	   if(v.custom.imported)
 		   {
 		  
 	  toImport.push(v);
 		   } }
 	    
 	});
 	
   	
    
 	
 	if(choice==0)
 		{
 		var zip = new JSZip();
     	var name = document.getElementById('fileName').value;
     	zip.file(name+".moe", JSON.stringify(this.graph.toJSON()));
     	for (var i in toImport) { 
     		
     			zip.file(toImport[i].attrs.text.text+".moe",JSON.stringify({"cells":[toImport[i]]}));
     			
     		}
     		
     	
     	var content = zip.generate({type:"blob"});
     	saveAs(content, name+".zip"); 
 		
 		
 		}
 	
 	if(choice==1)
 		{
 	
 	var graphicData=JSON.stringify(this.graph.toJSON());
 	
 	

 	// Convert the String to a JSON object
 	var myJSONObject = eval( '(' +  graphicData + ' )' );
 	
 	console.log(myJSONObject)

 	
 	if( pathChoosen==="" && typedName ==="")
 		{
 		
 		$("#dialog-box").dialog({
 		    autoOpen: false,
 		    modal: true,
 		    height: 200,
 		    width: 600,
 		    	
 		      buttons: {
 		        Save: function() {
 		        	
 		        	pathChoosen= pathChoosen=  owncloudserverLink+"/remote.php/webdav" ;
 		        	typedName=$('#filenameTyped').val();
 		        	$.ajax({
 		        	    url: pathChoosen+'/'+typedName,
 		        	    type: 'PUT',
 		        	   xhrFields: {
 		        	       withCredentials: true
 		        	    },
 		        	    crossDomain: true,
 		        	    data: graphicData, // or $('#myform').serializeArray()
 		        	    success: function() { }
 		        	});
 		        	for (var i in toImport) { 
 		        		if(userPreferences!=="")
          	        		userPreferences=userPreferences+";"+toImport[i].attrs.text.text+".moe";
          	        	else
          	        		userPreferences=toImport[i].attrs.text.text+".moe";
 		        		console.log(userPreferences);
 		        		$.ajax({
 		        			
 			        	    url: owncloudserverLink+'/remote.php/webdav/'+toImport[i].attrs.text.text+".moe",
 			        	    type: 'PUT',
 			        	   xhrFields: {
 			        	       withCredentials: true
 			        	    },
 			        	    crossDomain: true,
 			        	    data: JSON.stringify({"cells":[toImport[i]]}), // or $('#myform').serializeArray()
 			        	    success: function() { }
 			        	});
 		        		
 		    			
 		    		}
 		        	
 		        	$.ajax({
 		        	    url: owncloudserverLink+'/remote.php/webdav/'+".sensorNannyDraw",
 		        	    type: 'PUT',
 		        	   xhrFields: {
 		        	       withCredentials: true
 		        	    },
 		        	    crossDomain: true,
 		        	    data: userPreferences, // or $('#myform').serializeArray()
 		        	    success: function() { }
 		        	});
 		    		
 		          $( this ).dialog( "close" );
 		          
 		        }
 		      },
 		    open: function(ev, ui){
 		             $('#myIframe').attr('src',owncloudserverLink+'/remote.php/webdav');
 		          }
 		});


 		    $('#dialog-box').dialog('open');
 		
 		}
 	else
 		{
 		
 		
     	$.ajax({
     	    url: pathChoosen+'/'+typedName,
     	    type: 'PUT',
     	   xhrFields: {
     	       withCredentials: true
     	    },
     	    crossDomain: true,
     	    data: graphicData, // or $('#myform').serializeArray()
     	    success: function() { }
     	});
     	for (var i in toImport) { 
     		if(userPreferences!=="")
	        		userPreferences=userPreferences+";"+toImport[i].attrs.text.text+".moe";
	        		else
	        		userPreferences=toImport[i].attrs.text.text+".moe";
     		console.log(userPreferences);
     		$.ajax({
     			
         	    url: owncloudserverLink+'/remote.php/webdav/'+toImport[i].attrs.text.text+".moe",
         	    type: 'PUT',
         	   xhrFields: {
         	       withCredentials: true
         	    },
         	    crossDomain: true,
         	    data: JSON.stringify({"cells":[toImport[i]]}), // or $('#myform').serializeArray()
         	    success: function() { }
         	});
     		
 			
 		}
     	
     	$.ajax({
     	    url: owncloudserverLink+'/remote.php/webdav/'+".sensorNannyDraw",
     	    type: 'PUT',
     	   xhrFields: {
     	       withCredentials: true
     	    },
     	    crossDomain: true,
     	    data: userPreferences, // or $('#myform').serializeArray()
     	    success: function() { }
     	});
 		
 		
 		
 		
 		
 		}
 	
 		} 
   	
   		
           
           }, this));
        

        // toFront/toBack must be registered on mousedown. SelectionView empties the selection
        // on document mouseup which happens before the click event. @TODO fix SelectionView?
        $('#btn-to-front').on('mousedown', _.bind(function(evt) { this.selection.invoke('toFront'); }, this));
        $('#btn-to-back').on('mousedown', _.bind(function(evt) { this.selection.invoke('toBack'); }, this));

        $('#btn-layout').on('click', _.bind(this.layoutDirectedGraph, this));
        
        $('#input-gridsize').on('change', _.bind(function(evt) {
            var gridSize = parseInt(evt.target.value, 10);
            $('#output-gridsize').text(gridSize);
            this.setGrid(gridSize);
        }, this));

        $('#snapline-switch').change(_.bind(function(evt) {
            if (evt.target.checked) {
                this.snapLines.startListening();
            } else {
                this.snapLines.stopListening();
            }
        }, this));

        var $zoomLevel = $('#zoom-level');
        this.paper.on('scale', function(scale) {
            $zoomLevel.text(Math.round(scale * 100));
        });
    },

    initializeToolbarTooltips: function() {
        
        $('.toolbar-container [data-tooltip]').each(function() {
            
            new joint.ui.Tooltip({
                target: $(this),
                content: $(this).data('tooltip'),
                top: '.toolbar-container',
                direction: 'top'
            });
        });
    },

    toggleFullscreen: function() {

        var el = document.body;

        function prefixedResult(el, prop) {
            
            var prefixes = ['webkit', 'moz', 'ms', 'o', ''];
            for (var i = 0; i < prefixes.length; i++) {
                var prefix = prefixes[i];
                var propName = prefix ? (prefix + prop) : (prop.substr(0, 1).toLowerCase() + prop.substr(1));
                if (!_.isUndefined(el[propName])) {
                    return _.isFunction(el[propName]) ? el[propName]() : el[propName];
                }
            }
        }

        if (prefixedResult(document, 'FullScreen') || prefixedResult(document, 'IsFullScreen')) {
            prefixedResult(document, 'CancelFullScreen');
        } else {
            prefixedResult(el, 'RequestFullScreen');
        }
    },

    setGrid: function(gridSize) {

        this.paper.options.gridSize = gridSize;
        
        var backgroundImage = this.getGridBackgroundImage(gridSize);
        this.paper.$el.css('background-image', 'url("' + backgroundImage + '")');
    },

    getGridBackgroundImage: function(gridSize, color) {

        var canvas = $('<canvas/>', { width: gridSize, height: gridSize });

        canvas[0].width = gridSize;
        canvas[0].height = gridSize;

        var context = canvas[0].getContext('2d');
        context.beginPath();
        context.rect(1, 1, 1, 1);
        context.fillStyle = color || '#AAAAAA';
        context.fill();

        return canvas[0].toDataURL('image/png');
    },

    layoutDirectedGraph: function() {

        this.commandManager.initBatchCommand();
        
        _.each(this.graph.getLinks(), function(link) {

            // Reset vertices.
            link.set('vertices', []);
            
            // Remove all the non-connected links.
            if (!link.get('source').id || !link.get('target').id) {
                link.remove();
            }
        });

        var pad = 0; // padding for the very left and very top element.
        joint.layout.DirectedGraph.layout(this.graph, {
            setLinkVertices: false,
            rankDir: 'LR',
            rankDir: 'TB',
            setPosition: function(cell, box) {
                cell.position(box.x - box.width / 2 + pad, box.y - box.height / 2 + pad);
            }
        });

        // Scroll to the top-left corner as this is the initial position for the DirectedGraph layout.
        this.paperScroller.el.scrollLeft = 0;
        this.paperScroller.el.scrollTop = 0;
        
        this.commandManager.storeBatchCommand();
    },
  

    initializeChannel: function(url) {
        // Example usage of the Channel plugin. Note that this assumes the `node channelHub` is running.
        // See the channelHub.js file for furhter instructions.

        var room = (location.hash && location.hash.substr(1));
        if (!room) {
            room = joint.util.uuid();
            this.navigate('#' + room);
        }

        var channel = this.channel = new joint.com.Channel({ graph: this.graph, url: url || 'ws://localhost:4141', query: { room: room } });
        console.log('room', room, 'channel', channel.id);

        var roomUrl = location.href.replace(location.hash, '') + '#' + room;
        $('.statusbar-container .rt-colab').html('Send this link to a friend to <b>collaborate in real-time</b>: <a href="' + roomUrl + '" target="_blank">' + roomUrl + '</a>');
    },
    initializeAjaxRequests: function() {
        

    	var rappid=this;
    	var modelNames = []; 
    	var reqModels=[];
    	
       
       var reqModel=   $.ajax({

             //This will retrieve the contents of the folder if the folder is configured as 'browsable'
                url: "./models/",
                
                success: function (data) {

                  //Lsit all png file names in the page
                
                    $(data).find("a").each(function (index) {
                    		
                                    
                       var filename =this.href.split("/");
                      
                      filename=filename[filename.length-1];
                       if(filename.substring(0,1)!=='?')
                      modelNames.push(filename);
                    
                  	var modelNamesSplitted = filename.split("_");
                  
                  	var type=[];
                  	for( var i=1;i<modelNamesSplitted.length-1;i++)
                  		{
                  		
                  		type.push(modelNamesSplitted[i]);
                  		
                  		}
                  	var typeName=type.join("_");
                  	 if(filename.substring(0,10)!=='index.html')
                  		 {
                 
                  	reqModels[index]= $.ajax({
    			    	    url: 'models/'+filename,
    			    	    
    			    	   
    			    	    success: function(a) {
    			    	    	if(typeof a =='object')    			    	    		
    			    	    		Stencil.shapes[typeName].push(new joint.shapes.basic.ACOUSTIC_RELEASE(a));   			    	    	       
									
			    	    		 else if(a.substring(0, 4) =='{"do')    
			    	    			 
			    	    			 Stencil.shapes[typeName].push(new joint.shapes.basic.ACOUSTIC_RELEASE($.parseJSON(a)));
			    	    			 
    			    	    
    			    	    	
    			    	     			    	    	
    			    	    },
    			    	    error: function (){
    			    	    	
    			    	    	console.log("faailed");
    			    	    }
    			    	    
    			    	 
    			    	});
                  	
                  		 }


	
                    
                    });

                }

            });
          
       $.when(reqModel).done(function(){ 
    		
    		
          $.when.apply($, reqModels).done(function(){
  			
  		
  			
  			
  			rappid.initializeStencil();
  		      
  		});
          $.when.apply($, reqModels).fail(function(){
    			
        	 		
        			
        			rappid.initializeStencil();
        		      
        		});
    	
       });
       
    	if(location.search!="")
    		{
    	
    	var importedData = []; 
    	var req1= $.ajax({
    	    url:    owncloudserverLink+'/remote.php/webdav/.sensorNannyDraw' 
    	    
    	    ,
    	    xhrFields: {
       	       withCredentials: true
       	    },
    	success: function(result) {

    	 userPreferences=result;

    	       },
    	       
    	       error: function(){
    	    	   $(".se-pre-con").fadeOut("fast");
    	    	   }
    	    
    	});
    	var req=[];





    	$.when(req1).done(function(){
    		
    		console.log(1);
    		if(userPreferences==="")
    			{
    			$(".se-pre-con").fadeOut("fast");
    			}
    		else
    			{
    		var arr = userPreferences.split(';');
    		console.log(arr);
    		for (var i in arr) { 
    			if(arr[i]!=="")
    				{
    			  req[i]= $.ajax({
    			    	    url: owncloudserverLink+'/remote.php/webdav/'+arr[i],
    			    	    
    			    	   
    			    	    success: function(a) {
    			    	    	
    			    	    	importedData.push($.parseJSON(a));
    			    	    	
    			    	    	    			    	    	
    			    	    },
    			    	    xhrFields: {
    			    	        withCredentials: true
    			    	     },
    			    	     crossDomain: true,
    			    	    error: function (){
    			    	    	
    			    	    	importedData.push("fail");
    			    	    }
    			    	    
    			    	 
    			    	});
    				}
    			else
    				{
    				
    				 req[i]= $.ajax({
 			    	    url: owncloudserverLink+'/remote.php/webdav/fail',
 			    	    
 			    	   xhrFields: {
 			    	       withCredentials: true
 			    	    },
 			    	    crossDomain: true,
 			    	    
 			    	    error: function (){
 			    	    	
 			    	    	importedData.push("fail");
 			    	    }
 			    	    
 			    	 
 			    	});
    				
    				
    				
    				
    				
    				
    				
    				}
    			  	}
    		
    		


    		$.when.apply($, req).done(function(){
    			console.log("success");
    			console.log(arr.length);
    			for (var i in arr) {
    				
    			
    				 importedData[i].cells[0].custom.imported=false;
    			}
    			for (var i in arr) {
    				
    				
    				Stencil.shapes.Imported.push(new joint.shapes.basic.Platform(importedData[i].cells[0]));
    				
    				}
    			
    			rappid.initializeStencil();
    		      
    		   		$(".se-pre-con").fadeOut("fast");
    		});
    		
    		$.when.apply($, req).fail(function(){
    			console.log("fail");
    		
    		
    		      
    		   		$(".se-pre-con").fadeOut("fast");
    			
    		});
    		
    		
    		
    		
    			}
    		
    		
    	    

    	})
    		}
    	else
    		{
    		
    		rappid.initializeStencil();
    	    $(".se-pre-con").fadeOut("fast");
    		
    		}

    }
    
  
});




