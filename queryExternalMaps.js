//Загрузка и отображение дополнительных карт в левой панели

var queryExternalMaps = function()
{
	this.maps = [];
	this.loadedMaps = {};
}

queryExternalMaps.prototype = new leftMenu();

queryExternalMaps.prototype.load = function()
{
	if (!this.builded)
	{
		var hostButton = _input(null, [['dir','className','inputStyle'],['css','width','200px']]),
			nameButton = _input(null, [['dir','className','inputStyle'],['css','width','200px']]),
			loadButton = makeButton(_gtxt("Загрузить")),
			addMap = makeLinkButton(_gtxt("Добавить карту")),
			paramsTable = _table([_tbody([_tr([_td([_t(_gtxt("Хост"))],[['css','colSpan',2],['css','paddingTop','3px']])]),
											_tr([_td([hostButton]), _td()]),
											_tr([_td([_t(_gtxt("Имя"))],[['css','colSpan',2]])]),
											_tr([_td([nameButton]), _td([loadButton])])])],[['css','margin','3px 0px 0px 10px']]),
			_this = this;
		
		_(this.workCanvas, [_div([addMap],[['css','margin','5px 0px 5px 10px']]), paramsTable]);
		
		paramsTable.style.display = 'none';
		
		hostButton.value = (window.mapHostName ? window.mapHostName : parseUri(window.location.href).host);
		
		addMap.onclick = function()
		{
			if (paramsTable.style.display == 'none')
				paramsTable.style.display = '';
			else
				paramsTable.style.display = 'none';
		}
		
		loadButton.onclick = function()
		{
			if (hostButton.value == '')
				inputError(hostButton);
			
			if (nameButton.value == '')
				inputError(nameButton);
			
			if (hostButton.value == '' || nameButton.value == '')
				return;
			
			_this.addMapElem(hostButton.value, nameButton.value);
			
			nameButton.value = '';
		}

		this.mapsCanvas = _div(null,[['dir','className','drawingObjectsCanvas'],['css','paddingLeft','0px'], ['attr', 'id', 'externalMapsCanvas']]);
		
		_(this.workCanvas, [this.mapsCanvas]);
		
		for (var i = 0; i < this.maps.length; ++i)
			this.addMapElem(this.maps[i].hostName, this.maps[i].mapName);
		
		
		this.builded = true;
	}
}

queryExternalMaps.prototype.addMapElem = function(hostName, mapName)
{
	var mapElem = _div(),
		div = _div(null, [['css','position','relative'],['css','margin','2px 0px']]),
		remove = makeImageButton('img/closemin.png','img/close_orange.png');
	
	for (var i = 0; i < this.mapsCanvas.childNodes.length; ++i)
	{
		var divChild = this.mapsCanvas.childNodes[i];
		
		if (divChild.hostName == hostName && divChild.mapName == mapName)
			return;
	}
	
	div.hostName = hostName;
	div.mapName = mapName;
	
	remove.className = 'remove';
	remove.style.right = '7px';
	
	_(div, [mapElem, remove]);
	_(this.mapsCanvas, [div]);
	
	this.addMap(hostName, mapName, mapElem);
	
	remove.onclick = function()
	{
		div.removeNode(true);
		
		if (!mapElem.extLayersTree)
			return;
		
		forEachLayer(mapElem.extLayersTree.mapHelper.mapTree, function(layer, isVisible) 
		{ 
			var name = layer.properties.name;
			
			if (globalFlashMap.layers[name].external)
				mapElem.extLayersTree.removeLayer(name);
		});
	}
}

queryExternalMaps.prototype.addMap = function(hostName, mapName, parent)
{
	var loading = _div([_img(null, [['attr','src','img/progress.gif'],['css','marginRight','10px'],['css','width','16px'],['css','height','16px']]), _t(_gtxt('загрузка...'))], [['css','margin','3px 0px 3px 20px']]),
		_this = this;

	_(parent, [loading]);
	
	this.loadMap(hostName, mapName, function(treeJSON)
	{
		if (treeJSON == null)
		{
			loading.parentNode.parentNode.removeNode(true);
			
			showErrorMessage(_gtxt("Невозможно загрузить карту [value0] с домена [value1]", mapName, hostName), true);
			
			return;
		}
		
        var extMapHelper = new mapHelper(),
			extLayersTree = new layersTree({showVisibilityCheckbox: true, allowActive: false, allowDblClick: true});
		
		extMapHelper.mapTree = treeJSON;
		extLayersTree.mapHelper = extMapHelper;
		
		var	tree = extLayersTree.drawTree(treeJSON, 2);
		$(tree).treeview();
		extLayersTree.runLoadingFuncs();
        
		loading.removeNode(true);
		_(parent, [tree]);
        
        _queryMapLayers.addDraggable(parent);
		
		parent.extLayersTree = extLayersTree;
	});
}

queryExternalMaps.prototype.loadMap = function(hostName, mapName, callback)
{
	loadMapJSON(hostName, mapName, function(layers)
	{
		if (layers != null)
		{
			forEachLayer(layers, function(layer, isVisible) 
			{ 
				var name = layer.properties.name;
				
				if (!globalFlashMap.layers[name])
				{
					globalFlashMap.addLayer(layer, isVisible);
					globalFlashMap.layers[name].setVisible(isVisible);
					globalFlashMap.layers[name].bounds = getLayerBounds(globalFlashMap.layers[name].geometry.coordinates[0], globalFlashMap.layers[name]);
					
					globalFlashMap.layers[name].external = true;
				}
			});
			
			if (layers.properties.Copyright)
			{
				var obj = globalFlashMap.addObject();
				obj.setCopyright(layers.properties.Copyright);
			}
			if (layers.properties.OnLoad)
			{
				try { eval("_kosmosnimki_temp=(" + layers.properties.OnLoad + ")")(globalFlashMap); }
				catch (e) { alert(e); }
			}
			
			var data = layers;
			data.properties.hostName = hostName;
			
			callback(data);
			$(_queryExternalMaps).trigger('map_loaded', data);
		}
		else
		{
			callback(null);
			$(_queryExternalMaps).trigger('map_loaded', null);
		}
	}, 
	function()
	{
		callback(null);
		$(_queryExternalMaps).trigger('map_loaded', null);
	});
}

var _queryExternalMaps = new queryExternalMaps();