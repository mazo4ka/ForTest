var nsGmx = nsGmx || {};

/** Вспомогательные ф-ции ГеоМиксера
@namespace _mapHelper
*/

nsGmx.mapHelper = {
    
}

var mapHelp =
{
	mapHelp: {},
	serviceHelp: {},
	tabs: {},
	externalMaps : {}
}

var mapHelper = function()
{
	this.builded = false;
    //this._treeView = false;
	
	this.defaultStyles = 
	{
		'point':{outline:{color:0x0000FF, thickness:1},marker:{size:3}, fill:{color:0xFFFFFF, opacity:20}},
		'linestring':{outline:{color:0x0000FF, thickness:1}},
		'polygon':{outline:{color:0x0000FF, thickness:1}, fill:{color:0xFFFFFF, opacity:20}}
	}
	
	this.stylesDialogsHash = {};
	this.drawingDialogsHash = {};
	
	this.layerEditorsHash = {};
	
	this.attrValues = {};
	
	// контролирует пользовательские объекты, которые являются редактируемыми контурами растровых слоёв.
	// все такие объекты не будут сериализоваться
	this.drawingBorders = (function()
	{
		var _borders = {};
	
		//не будем сериализовать все пользовательские объекты, являющиеся контурами слоёв, так как это временные объекты
		nsGmx.DrawingObjectCustomControllers.addDelegate({
			isSerializable: function(obj)
			{
				for (var name in _borders)
					if (_borders[name] === obj) 
						return false;
				
				return true;
			}
		});

		return {
			set: function(name, obj)
			{
				_borders[name] = obj;
			},
			get: function(name)
			{
				return _borders[name];
			},
			length: function()
			{
				return objLength(_borders);
			},
			
			//callback(name, obj)
			forEach: function(callback)
			{
				for (var name in _borders)
					callback(name, _borders[name]);
			},
			
			updateBorder: function(name, span)
			{
				if (!_borders[name])
					return;
				
				if (span)
				{
                    var geom = _borders[name].geometry || _borders[name].getGeometry();
					_(span, [_t(prettifyArea(geoArea(geom.coordinates)))]);
					
					return;
				}
				
				if (!$$('drawingBorderDescr' + name))
					return;
				
				removeChilds($$('drawingBorderDescr' + name));
				
				_($$('drawingBorderDescr' + name), [_t(prettifyArea(geoArea(_borders[name].geometry.coordinates)))])
			}, 
			
			//Удаляет объект из списка контуров слоя
			//?removeDrawring {bool, default: false} - удалять ли сам пользовательский объект
			removeRoute: function(name, removeDrawing)
			{
				if (!(name in _borders))
					return;
					
				if (typeof removeDrawing !== 'undefined' && removeDrawing)
					_borders[name].remove();
				
				delete _borders[name];
				
				if ($$('drawingBorderDescr' + name))
					removeChilds($$('drawingBorderDescr' + name));
			}
		}
	})();
	
	this.unsavedChanges = false;
	
}

mapHelper.prototype = new leftMenu();

/** Менеджер кастомных параметров карты. 
 * Содержит набор провайдеров доп. параметров, которые могут сохранять и загружать данные из хранилища параметров
 * Данные загружаются один раз. Возможна асинхронная загрузка данных/добавление провайдеров.
 * Порядок вызова провайдеров не определён.
 *
 * @memberOf _mapHelper
 * @name customParamsManager
 */
mapHelper.prototype.customParamsManager = (function()
{
	var _providers = []; 
	var _params = []; //хранит параметры, которые не были загружены провайдерами
	
	var loadProviderState = function( provider )
	{
		if ( provider.name in _params && typeof provider.loadState !== 'undefined')
		{
			provider.loadState( _params[ provider.name ] );
			delete _params[ provider.name ];
		}
	}
	
	return {
		saveParams: function()
		{
			if ( !_providers.length ) return;
			var params = {};
			for (var p = 0; p < _providers.length; p++ )
			{
				if (typeof _providers[p].saveState !== 'undefined')
                    params[_providers[p].name] = _providers[p].saveState();
			}
				
			return params;
		},
		loadParams: function(params)
		{
			_params = params;
			for (var p = 0; p < _providers.length; p++ )
				loadProviderState( _providers[p] );
		},
		
		//интерфейс провайдера: name, saveState(), loadState(state)
		addProvider: function(provider)
		{
			_providers.push( provider );
			loadProviderState( provider );
		},
        
        isProvider: function(providerName) {
            return !!nsGmx._.findWhere(_providers, {name: providerName});
        },
        removeProvider: function(providerName) {
            _providers = nsGmx._.filter(_providers, function(provider) {
                return provider.name !== providerName;
            })
        }
	}
})();

mapHelper.prototype.makeStyle = function(style)
{
    style = style || {};
	var givenStyle = {};
	
	if (typeof style.RenderStyle != 'undefined')
		givenStyle = style.RenderStyle;
	else if (style.outline || style.marker)
		givenStyle = style;
	else
	{
		if (style.PointSize)
			givenStyle.marker = { size: parseInt(style.PointSize) };
		if (style.Icon)
		{
			var src = (style.Icon.indexOf("http://") != -1) ?
				style.Icon :
				(baseAddress + "/" + style.Icon);
			givenStyle.marker = { image: src, center: true };
		}
		if (style.BorderColor || style.BorderWidth)
			givenStyle.outline = {
				color: parseColor(style.BorderColor),
				thickness: parseInt(style.BorderWidth || "1")
			};
		if (style.FillColor)
			givenStyle.fill = {
				color: parseColor(style.FillColor),
				opacity: 100 - parseInt(style.Transparency || "0")
			};
	
		var label = style.label || style.Label;
		if (label)
			givenStyle.label = {
				field: label.FieldName,
				color: parseColor(label.FontColor),
				size: parseInt(label.FontSize || "12")
			};
	}
	
	return givenStyle;
}

mapHelper.prototype.getMapStateAsPermalink = function(callback)
{
    // сохраняем состояние карты
    var mapState = _mapHelper.getMapState();
    
    // туда же сохраним созданные объекты
    nsGmx.userObjectsManager.collect();
    mapState.userObjects = JSON.stringify(nsGmx.userObjectsManager.getData());
    
    nsGmx.Utils.TinyReference.create(mapState).then(callback);
}

mapHelper.prototype.reloadMap = function()
{
    _mapHelper.getMapStateAsPermalink(function(permalinkID)
    {
        createCookie("TempPermalink", permalinkID);
        window.location.replace(window.location.href.split("?")[0] + "?permalink=" + permalinkID + (defaultMapID == globalMapName ? "" : ("&" + globalMapName)));
    })
}

mapHelper.prototype.updateUnloadEvent = function(flag)
{
	if (typeof flag != 'undefined')
		this.unsavedChanges = flag;
	
	if (this.unsavedChanges)
	{
		window.onbeforeunload = function(e)
		{
			return _gtxt("В дереве слоев остались несохраненные изменения!");
		}
	}
	else
		window.onbeforeunload = null;
}

mapHelper.prototype.setBalloon = function(filter, template)
{
	filter.enableHoverBalloon(function(o)
	{
		return template.replace(/\[([a-zA-Z0-9_а-яА-Я ]+)\]/g, function()
		{
			var key = arguments[1];
			if (key == "SUMMARY")
				return o.getGeometrySummary();
			else
				return o.properties[key];
		});
	});
}

mapHelper.prototype.updateMapStyles = function(newStyles, name)
{
    var layer = globalFlashMap.layers[name];
    
	// удалим старые фильтры
	for (var i = layer.filters.length - 1; i > -1; i--) {
		layer.filters[i].remove();
	}
	
	layer.filters = [];
    
	// добавим новые
    newStyles.forEach(function(style) {
        layer.addFilter(style);
    });
}

//TODO: remove isEditableStyles
mapHelper.prototype.updateTreeStyles = function(newStyles, div, treeView, isEditableStyles)
{
    isEditableStyles = typeof isEditableStyles === 'undefined' || isEditableStyles;
	div.gmxProperties.content.properties.styles = newStyles;
	
	var multiStyleParent = $(div).children('[multiStyle]')[0];
	
	var parentIcon = $(div).children("[styleType]")[0],
		newIcon = _mapHelper.createStylesEditorIcon(newStyles, div.gmxProperties.content.properties.GeometryType.toLowerCase(), {addTitle: isEditableStyles});
		
	$(parentIcon).empty().append(newIcon).attr('styleType', $(newIcon).attr('styleType'));
	
	removeChilds(multiStyleParent);
	
	_mapHelper.createMultiStyle(div.gmxProperties.content.properties, treeView, multiStyleParent)
}

mapHelper.prototype.restoreTinyReference = function(id, callbackSuccess, errorCallback)
{
	window.suppressDefaultPermalink = true;
    nsGmx.Utils.TinyReference.get(id).then(function(obj) {
		if (obj.position)
		{
			obj.position.x = from_merc_x(obj.position.x);
			obj.position.y = from_merc_y(obj.position.y);
			obj.position.z = 17 - obj.position.z;
			if (obj.drawnObjects)
				for (var i in obj.drawnObjects)
				{
					obj.drawnObjects[i].geometry = from_merc_geometry(obj.drawnObjects[i].geometry);
					obj.drawnObjects[i].color = obj.drawnObjects[i].color || '0000ff';
				}
		}
        obj.originalReference = id;
		callbackSuccess(obj);
    }, errorCallback);
}

mapHelper.prototype.getMapState = function()
{
	var drawnObjects = [],
		condition = {expanded:{}, visible:{}};
	
	globalFlashMap.drawing.forEachObject(function(o) 
	{
		if (!nsGmx.DrawingObjectCustomControllers.isSerializable(o))
			return;
			
		var elem = {properties: o.properties, color: o.color, geometry: merc_geometry(o.geometry)};
		
		if (o.geometry.type != "POINT")
		{
			var style = o.getStyle();
			
			elem.thickness = style.regular.outline.thickness;
			elem.color = style.regular.outline.color;
			elem.opacity = style.regular.outline.opacity;
		}
		
		if ( o.balloon ) elem.isBalloonVisible = o.balloon.isVisible;
		
		drawnObjects.push(elem);
	});
	
	this.findTreeElems(_layersTree.treeModel.getRawTree(), function(elem)
	{
        var props = elem.content.properties;
		if (elem.type == 'group')
		{
			var groupId = props.GroupID;

			if (!$("div[GroupID='" + groupId + "']").length && !props.changedByViewer)
				return;
			
			condition.visible[groupId] = props.visible;
			condition.expanded[groupId] = props.expanded;
		}
		else
		{
            if (props.changedByViewer) {
                condition.visible[props.name] = props.visible;
            }
			// if (props.LayerID && !$("div[LayerID='" + props.LayerID + "']").length && !props.changedByViewer)
				// return;
			// else if (props.MultiLayerID && !$("div[MultiLayerID='" + props.MultiLayerID + "']").length && !props.changedByViewer)
				// return;
			
			//condition.visible[elem.content.properties.name] = elem.content.properties.visible;
		}
	})
	
	return {
		mode: globalFlashMap.getBaseLayer(),
		mapName: globalMapName,
		position: { 
			x: merc_x(globalFlashMap.getX()), 
			y: merc_y(globalFlashMap.getY()), 
			z: 17 - globalFlashMap.getZ() 
		},
		mapStyles: this.getMapStyles(),
		drawnObjects: drawnObjects,
		isFullScreen: layersShown ? "false" : "true",
		condition: condition,
		language: window.language,
		customParams : typeof window.collectCustomParams != 'undefined' ? window.collectCustomParams() : null,
		customParamsCollection: this.customParamsManager.saveParams()
	}
}

mapHelper.prototype.getMapStyles = function()
{
	var styles = {};
	
	this.findChilds(_layersTree.treeModel.getRawTree(), function(child)
	{
		if (child.content.properties.type == "Vector" && $("div[LayerID='" + child.content.properties.LayerID + "']").length)
			styles[child.content.properties.name] = child.content.properties.styles;
	}, true);
	
	return styles;
}

mapHelper.prototype.showPermalink = function()
{
	this.createPermalink(function(id){
        var url = "http://" + window.location.host + window.location.pathname + "?permalink=" + id + (defaultMapID == globalMapName ? "" : ("&" + globalMapName));
        var input = _input(null, [['dir','className','inputStyle inputFullWidth'],['attr','value', url]]);

        showDialog(_gtxt("Ссылка на текущее состояние карты"), _div([input]), 311, 80, false, false);
        
        input.select();
    });
}

mapHelper.prototype.createPermalink = function(callback)
{
	var mapState = this.getMapState();
    nsGmx.Utils.TinyReference.create(mapState).then(callback);
}

mapHelper.prototype.createSuggestCanvas = function(values, textarea, textTamplate, func, valuesArr, addValueFlag)
{
	var _this = this;
	
	if ( typeof valuesArr != 'undefined' && valuesArr && !(valuesArr instanceof nsGmx.ILazyAttributeValuesProvider) )
		valuesArr = new nsGmx.LazyAttributeValuesProviderFromArray(valuesArr);
	
	var canvas = _div(null, [['dir','className','attrsHelper']]);
	canvas.style.display = 'none';
	
	canvas.onmouseout = function(e)
	{
		var evt = e || window.event,
			target = evt.srcElement || evt.target,
			relTarget = evt.relatedTarget || evt.toElement;
		
		if (canvas.getAttribute('arr'))
		{
			try 
			{		
				while (relTarget)
				{
					if (relTarget == canvas)
						return;
					relTarget = relTarget.parentNode;
				}
				$(canvas).fadeOut(300, function(){$(this).remove();});
			}
			catch (e)
			{
				if (target == canvas)
					$(canvas).fadeOut(300, function(){$(this).remove();});
			}
		}
	}
			
	for (var i = 0; i < values.length; i++)
	{
		var div = _div([_t(String(values[i]))], [['dir','className','attrsHelperElem']]);
		
		(function(value)
		{
			div.onmouseover = function()
			{
				var _curDiv = this;
				$(this.parentNode).children(".attrsHelperHover").removeClass("attrsHelperHover");
				$(this).addClass('attrsHelperHover');
				
				if (typeof valuesArr == 'undefined' || valuesArr == false)
					return;
				
				$(canvas.parentNode).children("[arr]").each(function()
				{
					if (this.getAttribute('arr') != value)
					{
						$(this).fadeOut(300, function()
						{
							$(this).remove();
						})
					}
				})
				
				// if (typeof valuesArr[value] == 'undefined' || !valuesArr[value].length)
					// return;
				if (!valuesArr.isAttributeExists(value)) return;
				
				if (!$(canvas.parentNode).children("[arr='" + value + "']").length)
				{
					this.timer = setTimeout(function()
					{
						valuesArr.getValuesForAttribute( value, function(attrValues){
							
							if ( !attrValues || !$(_curDiv).hasClass("attrsHelperHover") ) return;
							
							var canvasArr = _mapHelper.createSuggestCanvas(attrValues, textarea, 'suggest', function()
								{
									func();
									
									$(canvasArr.parentNode.childNodes[1]).fadeOut(300);
									
									canvasArr.removeNode(true);
								}, false, addValueFlag);
							
							canvasArr.style.left = '105px';
							canvasArr.style.height = '70px';
							canvasArr.style.width = '100px';
							
							$(canvasArr).children().css('width','80px');
							
							canvasArr.setAttribute('arr', value);
							
							_(canvas.parentNode, [canvasArr]);
							
							$(canvasArr).fadeIn(300);
							
							//stopEvent(e);
						})
						
					}, 300);
				}
			}
		})(values[i])
		
		div.onmouseout = function(e)
		{
			var evt = e || window.event,
				target = evt.srcElement || evt.target,
				relTarget = evt.relatedTarget || evt.toElement;
			
			if ($(target).hasClass('attrsHelperHover') && relTarget == this.parentNode)
				$(this).removeClass('attrsHelperHover');
			
			if (this.timer)
				clearTimeout(this.timer);
		};
		
		(function(value)
		{
			div.onclick = function(e)
			{
				var val = value;
				if (this.parentNode.getAttribute('arr') != null)
				{
					if (isNaN(Number(val)))
						val = "\'" + val + "\'";
					
					if (addValueFlag)
						val = "\"" + this.parentNode.getAttribute('arr') + "\"" + ' = ' + val;
				}
				
				insertAtCursor(textarea, val, this.parentNode.sel);
				
				$(canvas).fadeOut(300);
				
				if (this.timer)
					clearTimeout(this.timer);
				
				$(canvas.parentNode).children("[arr]").fadeOut(300, function()
						{
							$(this).remove();
						})
				
				func();
				
				stopEvent(e);
			}
		})(textTamplate.replace(/suggest/g, values[i]));
		
		_title(div, values[i]);
		
		_(canvas, [div]);
	}
	
	return canvas;
}

mapHelper.prototype.updateTinyMCE = function(container) {
    gmxCore.loadModule('TinyMCELoader', function() {
        $('.balloonEditor', container).each(function() {
            var id = $(this).attr('id');
            if (!tinyMCE.get(id)) {
                tinyMCE.execCommand("mceAddControl", true, id);
            }
        })
    });
}

mapHelper.ImageInputControl = function(initURL)
{
    var prevValue = initURL || '';
    var inputUrl = _input(null, [['dir','className','inputStyle'],['attr','value', prevValue], ['css','width','170px']]);
    _title(inputUrl, _gtxt("URL изображения"));
    
    var _this = this;
    
    var update = function()
    {
        if (inputUrl.value != prevValue)
        {
            prevValue = inputUrl.value;
            $(_this).change();
        }
    }
    
    var mainDiv = $("<div/>").append(inputUrl);
    inputUrl.onkeyup = inputUrl.change = update;
    
    if (nsGmx.AuthManager.canDoAction(nsGmx.ACTION_UPLOAD_FILES))
    {
        var userImageIcon = makeImageButton("img/choose2.png", "img/choose2_a.png");
        userImageIcon.onclick = function()
        {
            var imagesDir = nsGmx.AuthManager.getUserFolder() + 'images';
            sendCrossDomainJSONRequest(serverBase + 'FileBrowser/CreateFolder.ashx?WrapStyle=func&FullName=' + encodeURIComponent(imagesDir), function(response)
            {
                if (!parseResponse(response))
                    return;
                    
                _fileBrowser.createBrowser(_gtxt("Изображение"), ['jpg', 'jpeg', 'png', 'gif', 'swf'], function(path)
                {
                    var relativePath = path.substring(imagesDir.length);
                    if (relativePath[0] == '\\') 
                        relativePath = relativePath.substring(1);
                        
                    inputUrl.value = serverBase + "GetImage.ashx?usr=" + encodeURIComponent(nsGmx.AuthManager.getLogin()) + "&img=" + encodeURIComponent(relativePath);
                    update();
                }, {startDir: imagesDir, restrictDir: imagesDir})
            })
        }
        mainDiv.append(userImageIcon);
    }

    this.getControl = function()
    {
        return mainDiv[0];
    }
    
    this.value = function()
    {
        return inputUrl.value;
    }
}

//params:
//  * addTitle {bool, default: true} 
mapHelper.prototype.createStylesEditorIcon = function(parentStyles, type, params)
{
    var _params = $.extend({addTitle: true}, params);
	var icon;
	
	if (isArray(parentStyles) && parentStyles.length > 1)
		icon =  _img(null, [['attr','src','img/misc.png'],['css','margin','0px 2px -3px 4px'],['css','cursor','pointer'],['attr','styleType','multi']]);
	else 
	{
		var parentStyle = _mapHelper.makeStyle(parentStyles[0]);
		
		if (parentStyle.marker && parentStyle.marker.image)
		{
			if (typeof parentStyle.marker.color == 'undefined')
			{
				icon = _img(null, [['dir','className','icon'],['attr','styleType','icon']]);
				
				var fixFunc = function()
					{
						var width = this.width,
							height = this.height,
                            scale;
                            
                        if (width && height) {
							var scaleX = 14.0 / width;
							var scaleY = 14.0 / height
							scale = Math.min(scaleX, scaleY);
                        } else {
                            scale = 1;
                            width = height = 14;
                        }
						
						setTimeout(function()
						{
							icon.style.width = Math.round(width * scale) + 'px';
							icon.style.height = Math.round(height * scale) + 'px';
						}, 10);
					}
				
				icon.onload = fixFunc;
                icon.src = parentStyle.marker.image;
			}
			else
			{
				var dummyStyle = {};
				
				$.extend(dummyStyle, parentStyle);
				
				dummyStyle.outline = {color: parentStyle.marker.color, opacity: 100};
				dummyStyle.fill = {color: parentStyle.marker.color, opacity: 100};
				
				icon = nsGmx.Controls.createGeometryIcon(dummyStyle, type);
			}
		}
		else
		{
			icon = nsGmx.Controls.createGeometryIcon(parentStyle, type);
		}
	}
	
    if (_params.addTitle)
        _title(icon, _gtxt("Редактировать стили"));
	
	icon.geometryType = type;
	
	return icon;
}

mapHelper.prototype.createLoadingLayerEditorProperties = function(div, parent, layerProperties, params)
{
	var elemProperties = div.gmxProperties.content.properties,
		loading = _div([_img(null, [['attr','src','img/progress.gif'],['css','marginRight','10px']]), _t(_gtxt('загрузка...'))], [['css','margin','3px 0px 3px 20px']]),
        type = elemProperties.type,
		_this = this;

    if (type == "Vector")
    {
        nsGmx.createLayerEditor(div, type, parent, layerProperties, params);
        
        return;
    }
    else
    {
        if (elemProperties.LayerID)
        {
            _(parent, [loading]);
        
            sendCrossDomainJSONRequest(serverBase + "Layer/GetLayerInfo.ashx?WrapStyle=func&LayerName=" + elemProperties.name, function(response)
            {
                if (!parseResponse(response))
                    return;
                
                loading.removeNode(true);
                
                nsGmx.createLayerEditor(div, type, parent, response.Result, params)
            })
        }
    }
}

mapHelper.prototype.createNewLayer = function(type)
{
	if ($$('new' + type + 'Layer'))
		return;

	var parent = _div(null, [['attr','id','new' + type + 'Layer'], ['css', 'height', '100%']]),
		height = (type == 'Vector') ? 340 : 360;

    if (type !== 'Multi')
    {
		var properties = {Title:'', Description: '', Date: '', TilePath: {Path:''}, ShapePath: {Path:''}};
        var dialogDiv = showDialog(type != 'Vector' ? _gtxt('Создать растровый слой') : _gtxt('Создать векторный слой'), parent, 340, height, false, false);
        nsGmx.createLayerEditor(false, type, parent, properties,
            {
                doneCallback: function() 
                {
                    removeDialog(dialogDiv); 
                }
            }
        );
    }
    else
    { //мультислой
        var _this = this;
        nsGmx.createMultiLayerEditorNew( _layersTree );
    }
}

// Формирует набор элементов tr используя контролы из shownProperties.
// Параметры:
// - shownProperties: массив со следующими свойствами:
//   * tr - если есть это свойство, то оно помещается в tr, все остальные игнорируются
//   * name - названия свойства, которое будет писаться в левой колонке
//   * elem - если есть, то в правую колонку помещается этот элемент
//   * field - если нет "elem", в правый столбец подставляется layerProperties[field]
//   * trid - id для DOM элементов. Не применяется, если прямо указано tr
//   * trclass - class для DOM элементов. Не применяется, если прямо указано tr
// - layerProperties - просто хеш строк для подстановки в правую колонку
// - style:
//   * leftWidth - ширина левой колонки в пикселях
//   * leftcolumnclass - class для td элементов первого столбца. Не применяется, если прямо указано tr
//   * rightcolumnclass - class для td элементов второго столбца. Не применяется, если прямо указано tr
mapHelper.prototype.createPropertiesTable = function(shownProperties, layerProperties, style)
{
	var _styles = $.extend({leftWidth: 100}, style);
	var trs = [];
	for (var i = 0; i < shownProperties.length; i++)
	{
		var td;
		if (typeof shownProperties[i].tr !== 'undefined')
		{
			trs.push(shownProperties[i].tr);
			continue;
		}
		
		if (typeof shownProperties[i].elem !== 'undefined')
			td = _td([shownProperties[i].elem]);
		else
			td = _td([_t(layerProperties[shownProperties[i].field] != null ? layerProperties[shownProperties[i].field] : '')],[['css','padding','0px 3px']]);
            
        var tdTitle = _td([_t(shownProperties[i].name)],[['css','width', _styles.leftWidth + 'px'],['css','paddingLeft','5px'],['css','fontSize','12px']]);
        
		var tr = _tr([tdTitle, td]);
        
        if (_styles.leftcolumnclass)
            _(tdTitle, [], [['dir', 'className', _styles.leftcolumnclass]]);
            
        if (_styles.rightcolumnclass)
            _(td, [], [['dir', 'className', _styles.rightcolumnclass]]);
		
        if (shownProperties[i].trid)
            _(tr, [], [['attr', 'id', shownProperties[i].trid]]);
            
        if (shownProperties[i].trclass)
            _(tr, [], [['dir', 'className', shownProperties[i].trclass]]);
        
		trs.push(tr);
	}
	
	return trs;
}

mapHelper.prototype.createLayerEditor = function(div, treeView, selected, openedStyleIndex)
{
	var elemProperties = div.gmxProperties.content.properties,
        layerName = elemProperties.name,
		_this = this;
	
	if (elemProperties.type == "Vector")
	{
		if (typeof this.layerEditorsHash[layerName] != 'undefined')
		{
			if (this.layerEditorsHash[layerName] != false) {
                this.layerEditorsHash[layerName].selectTab(selected);
            }

			return;
		}
		
		this.layerEditorsHash[layerName] = false;
		
		var mapName = elemProperties.mapName,
			createTabs = function(layerProperties)
			{
				var id = 'layertabs' + layerName,
					divProperties = _div(null,[['attr','id','properties' + id], ['css', 'height', '100%']]),
					tabMenu,
                    additionalTabs = [];
				
				var pos = nsGmx.Utils.getDialogPos(div, true, 390),
                    updateFunc = function()
                    {
                    },
					closeFunc = function()
					{
                        updateFunc();
						return false;
					};
				
				_this.createLoadingLayerEditorProperties(div, divProperties, layerProperties, {
                    doneCallback: function()
                    {
                        $(divDialog).dialog('close');
                    },
                    additionalTabs: additionalTabs,
                    selected: selected,
                    createdCallback: function(layerEditor) {
                        _this.layerEditorsHash[layerName] = layerEditor;
                        _this.layerEditorsHash[layerName].closeFunc = closeFunc;
                        _this.layerEditorsHash[layerName].updateFunc = updateFunc;
                    }
                });
				
				var divDialog = showDialog(_gtxt('Слой [value0]', elemProperties.title), divProperties, 350, 470, pos.left, pos.top, null, function()
                {
                    closeFunc();
                    delete _this.layerEditorsHash[layerName];
                });
                
				// при сохранении карты сбросим все временные стили в json карты
				divProperties.closeFunc = closeFunc;
				divProperties.updateFunc = updateFunc;
			};
		
		if (!this.attrValues[mapName])
			this.attrValues[mapName] = {};

		sendCrossDomainJSONRequest(serverBase + "Layer/GetLayerInfo.ashx?WrapStyle=func&NeedAttrValues=false&LayerName=" + layerName, function(response)
		{
			if (!parseResponse(response))
				return;
			
            var columns = response.Result.Columns;
            var attributesHash = {};
            
            for (var i = 0; i < columns.length; i++) {
                attributesHash[columns[i].Name] = [];
            }
            
			_this.attrValues[mapName][layerName] = new nsGmx.LazyAttributeValuesProviderFromServer(attributesHash, layerName);
			
			createTabs(response.Result);
		})
	}
	else
	{
		if (elemProperties.LayerID)
		{
			if (this.layerEditorsHash[layerName])
				return;
			
			this.layerEditorsHash[layerName] = true;
			
			var id = 'layertabs' + layerName,
				divProperties = _div(null,[['attr','id','properties' + id], ['css', 'height', '100%']]),
				divStyles = _div(null,[['attr','id','styles' + id], ['css', 'height', '100%'], ['css', 'overflowY', 'auto']]);
            
			var parentObject = globalFlashMap.layers[layerName],
				parentStyle = elemProperties.styles && elemProperties.styles[0] || elemProperties;
                
            var zoomPropertiesControl = new nsGmx.ZoomPropertiesControl(parentStyle.MinZoom, parentStyle.MaxZoom),
                liMinZoom = zoomPropertiesControl.getMinLi(),
                liMaxZoom = zoomPropertiesControl.getMaxLi();
			
            $(zoomPropertiesControl).change(function()
            {
                parentObject.setZoomBounds(this.getMinZoom(), this.getMaxZoom());
            });

			_(divStyles, [_ul([liMinZoom, liMaxZoom])]);

			this.createLoadingLayerEditorProperties(div, divProperties, null, {
                doneCallback: function()
                {
                    $(divDialog).dialog('close');
                },
                additionalTabs: [{title: _gtxt("Стили"), name: 'styles', container: divStyles}]
                
            });
			
			var pos = nsGmx.Utils.getDialogPos(div, true, 330),
				closeFunc = function()
				{
                    elemProperties.styles = elemProperties.styles || [];
                    elemProperties.styles[0] = elemProperties.styles[0] || {};
                    
					elemProperties.styles[0].MinZoom = zoomPropertiesControl.getMinZoom();
					elemProperties.styles[0].MaxZoom = zoomPropertiesControl.getMaxZoom();
					
					delete _this.layerEditorsHash[layerName];
					
					treeView.findTreeElem(div).elem.content.properties = elemProperties;
					
					_this.drawingBorders.removeRoute(layerName, true);
					
					if ($$('drawingBorderDialog' + layerName))
						removeDialog($$('drawingBorderDialog' + layerName).parentNode);
					
					return false;
				};
			
			var divDialog = showDialog(_gtxt('Слой [value0]', elemProperties.title), divProperties, 330, 410, pos.left, pos.top, null, closeFunc);
		}
		else
		{
            nsGmx.createMultiLayerEditorServer(elemProperties, div, treeView);
        }
	}
}

mapHelper.prototype.createWFSStylesEditor = function(parentObject, style, geometryType, divCanvas)
{
	var _this = this,
		templateStyle = {};
	
	$.extend(true, templateStyle, style);
    
    var elemCanvas = _mapHelper.createStylesEditorIcon([{MinZoom:1, MaxZoom: 21, RenderStyle: style.regularStyle}], geometryType);
    var spanIcon = _span([elemCanvas]);
    
	spanIcon.onclick = function()
	{
        var listenerId = parentObject.addListener('onSetStyle', function(style)
            {
                var newIcon = _this.createStylesEditorIcon([{MinZoom:1,MaxZoom:21,RenderStyle:style.regularStyle}], geometryType);
                $(spanIcon).empty().append(newIcon).attr('styleType', $(newIcon).attr('styleType'));
            });
            
		var canvasStyles = _div(null,[['css','marginTop','10px']]),
			canvasCharts = _div(null,[['css','marginTop','10px']]),
			closeFunc = function()
			{
				$(canvasStyles).find(".colorSelector").each(function()
				{
					var colorPicker = $$($(this).data("colorpickerId"));
                    if (colorPicker)
                         colorPicker.removeNode(true);
				});
				
				var layerElemCanvas = $(divCanvas).find("[geometryType='" + geometryType.toUpperCase() + "']")[0];
				layerElemCanvas.graphDataType = $(canvasCharts).find("select")[0].value;
				layerElemCanvas.graphDataProperties = $(canvasCharts).find("input")[0].value;
                
                parentObject.removeMapStateListener('onSetStyle', listenerId);
			};
		
		var id = 'wfstabs' + String(Math.random()).substring(2, 9),
			tabMenu = _div([_ul([_li([_a([_t(_gtxt("Стили"))],[['attr','href','#styles' + id]])]),
								 _li([_a([_t(_gtxt("Диаграммы"))],[['attr','href','#graph' + id]])])])]),
			divStyles = _div(null,[['attr','id','styles' + id]]),
			divGraph = _div(null,[['attr','id','graph' + id]]);
		
		_(tabMenu, [divStyles, divGraph]);
		
        gmxCore.loadModule('LayerStylesEditor').done(function(module) {
            var resObject = module.createStyleEditor(canvasStyles, templateStyle, geometryType, false);
            
            $(resObject).change(function()
            {
                nsGmx.Utils.setMapObjectStyle(parentObject, templateStyle);
            })
        });
        
		canvasStyles.firstChild.style.marginLeft = '0px';
		_(divStyles, [canvasStyles]);
		
		_mapHelper.createChartsEditor(canvasCharts, $(divCanvas).find("[geometryType='" + geometryType.toUpperCase() + "']")[0]);
		canvasCharts.firstChild.style.marginLeft = '0px';
		_(divGraph, [canvasCharts]);
		
		var pos = nsGmx.Utils.getDialogPos(spanIcon, false, 160);
		showDialog(_gtxt('Редактирование стилей объекта'), tabMenu, 330, 180, pos.left, pos.top, false, closeFunc);
		
		$(tabMenu).tabs({active: 0});
	}
	
	spanIcon.getStyle = function()
	{
		return templateStyle;
	}
    
    return spanIcon;
}

mapHelper.prototype.createChartsEditor = function(parent, elemCanvas)
{
	var graphTypeSel = nsGmx.Utils._select([_option([_t(_gtxt("График по времени"))], [['attr','value','func']]),
								_option([_t(_gtxt("Круговая"))], [['attr','value','pie']])], [['dir','className','selectStyle'],['css','width','180px']]),
		propertiesMask = _input(null, [['dir','className','inputStyle'],['css','width','180px']]);
	
	switchSelect(graphTypeSel, elemCanvas.graphDataType);
	propertiesMask.value = elemCanvas.graphDataProperties;
	
	_(parent, [_table([_tbody([_tr([_td([_t(_gtxt("Тип"))], [['css','width','100px']]), _td([graphTypeSel])]),
								_tr([_td([_t(_gtxt("Маска атрибутов"))]), _td([propertiesMask])])])])]);
}

mapHelper.prototype.createMultiStyle = function(elem, treeView, multiStyleParent, treeviewFlag, layerManagerFlag)
{
	var filters = elem.styles;
	
	if (filters.length < 2)
	{
		multiStyleParent.style.display = 'none';
		
		return;
	}
	
	multiStyleParent.style.display = '';
	
	var ulFilters = _ul();
	
	for (var i = 0; i < filters.length; i++)
	{
		var icon = this.createStylesEditorIcon([elem.styles[i]], elem.GeometryType.toLowerCase(), {addTitle: !layerManagerFlag}),
			name = elem.styles[i].Name || elem.styles[i].Filter || 'Без имени ' + (i + 1),
            iconSpan = _span([icon]),
			li = _li([_div([iconSpan, _span([_t(name)],[['css','marginLeft','3px']])])]);
            
        $(iconSpan).attr('styleType', $(icon).attr('styleType'));
		
		if (!layerManagerFlag)
		{ 
			(function(i)
			{
				iconSpan.onclick = function()
				{
                    nsGmx.createStylesDialog(elem, treeView, i);
					//_mapHelper.createLayerEditor(multiStyleParent.parentNode, treeView, 'styles', i);
				}
			})(i);
		}
		
		_(ulFilters, [li])
	}
	
	ulFilters.style.display = 'none';
	ulFilters.className = 'hiddenTree';
	
	_(multiStyleParent, [_ul([_li([_div([_t(_gtxt("Стили слоя"))]), ulFilters])])]);
	
	if (typeof treeviewFlag == 'undefined')
        $(multiStyleParent.firstChild).treeview();
}

mapHelper.prototype.load = function()
{
	var _this = this;
	
	if (!this.builded)
	{
		var fileName;
		
		if (typeof window.gmxViewerUI !== 'undefined' && typeof window.gmxViewerUI.usageFilePrefix !== 'undefined')
			fileName = window.gmxViewerUI.usageFilePrefix;
		else
			fileName = window.gmxJSHost ? window.gmxJSHost + "usageHelp" : "usageHelp";
		
		fileName += _gtxt("helpPostfix");
		
		_mapHelper._loadHelpTextFromFile(fileName, function( text )
		{
			var div = _div(null, [['dir','className','help']]);
			div.innerHTML = text;
			_(_this.workCanvas, [div]);
		});
		
		this.builded = true;
	}
}

mapHelper.prototype._loadHelpTextFromFile = function( fileName, callback, num, data )
{
	var proceess = function( text )
	{
		//if (num ) text = text.replace("{gmxVersion}", num);
		//if (data) text = text.replace("{gmxData}", data);
		callback(Mustache.render(text, {gmxVersion: num, gmxData: data}));
	}
	
	if (fileName.indexOf("http://") !== 0)
		$.ajax({url: fileName, success: proceess});
	else
		sendCrossDomainJSONRequest(serverBase + "ApiSave.ashx?get=" + encodeURIComponent(fileName), function(response)
		{
			proceess(response.Result);
		});	
}

mapHelper.prototype.version = function()
{
    var div = $("<div class='gmx-about'></div>");
        
    var fileName;
    
    if (typeof window.gmxViewerUI !== 'undefined' && typeof window.gmxViewerUI.helpFilePrefix !== 'undefined')
        fileName = window.gmxViewerUI.helpFilePrefix;
    else
        fileName = window.gmxJSHost ? window.gmxJSHost + "help" : "help";
    
    fileName += _gtxt("helpPostfix");
    
    _mapHelper._loadHelpTextFromFile( fileName, function(text)
    {
        div.html(text);
        showDialog(_gtxt("О проекте"), div[0], 500, 300, false, false);
    }, window.nsGmx.GeomixerFrameworkVersion, '' );
}

mapHelper.prototype.createAPIMapDialog = function()
{
    var mapProperties = _layersTree.treeModel.getMapProperties();
	var options = {
			requestAPIKey: (mapProperties.UseKosmosnimkiAPI || mapProperties.hostName == "maps.kosmosnimki.ru") && window.apiKey !== false,
			saveBaseLayers: false
		};
		
	if (window.defaultLayersVisibility) options.defaultLayersVisibility = window.defaultLayersVisibility;
	
	nsMapCommon.createAPIMapDialog(
		mapProperties.name, 
		mapProperties.hostName, 
		options
	);
}

mapHelper.prototype.print = function()
{
		var printPage = 'print-iframe' + (gmxAPI.proxyType == 'leaflet' ? '_leaflet' : '');
		//var printMap = this.createAPIMap(false),
		var loadFunc = uniqueGlobalName(function()
			{
				var drawnObjects = [],
					layersVisibility = {};
				
				_layersTree.treeModel.forEachLayer(function(layer)
				{
					layersVisibility[layer.properties.name] = layer.isVisible;
				});
				
				globalFlashMap.drawing.forEachObject(function(o) 
				{
					var elem = {properties: o.properties, color: o.color, geometry: o.geometry};
					
					if (o.geometry.type != "POINT")
					{
						var style = o.getStyle();
						
						elem.thickness = style.regular.outline.thickness;
						elem.color = style.regular.outline.color;
						elem.opacity = style.regular.outline.opacity;
					}
					
					drawnObjects.push(elem);
				});
				
				var mapState = {
					host: _layersTree.treeModel.getMapProperties().hostName,
					mode: globalFlashMap.getBaseLayer(),
					mapName: globalMapName,
					position: { 
						x: globalFlashMap.getX(), 
						y: globalFlashMap.getY(), 
						z: globalFlashMap.getZ()
					},
					layersVisibility: layersVisibility,
					drawnObjects: drawnObjects,
					language: window.language,
					grid: _mapHelper.gridView
				}
				
				if ( window.apiKey )
					mapState.apiKey = window.apiKey;
				
				return mapState;
			}),
			printDoc = window.open(printPage + ".html?" + loadFunc, "_blank", "width=" + String(640) + ",height=" + String(getWindowHeight()) + ",resizable=yes,scrollbars=yes");
		
		printDoc.document.close();
		
		var interval = setInterval(function()
		{
			if (printDoc.createFlashMap)
			{
				clearInterval(interval);
				
				printDoc.resize();
			}
		}, 200)
		
		return false;
}

//вызывает callback для всех слоёв поддерева treeElem. Параметры: callback(layerInfo, visibilityFlag)
mapHelper.prototype.findChilds = function(treeElem, callback, flag)
{
	var childsArr = treeElem.content ? treeElem.content.children : treeElem.children;
	if (childsArr)
	{
		for (var i = 0; i < childsArr.length; i++)
		{
			var child = childsArr[i];
			
			if (child.type == 'group')
				this.findChilds(child, callback, flag && child.content.properties.visible)
			else
				callback(child, flag && child.content.properties.visible);
		}
	}
}

mapHelper.prototype.findTreeElems = function(treeElem, callback, flag, list)
{
	var childsArr = treeElem.content ? treeElem.content.children : treeElem.children;
	
	for (var i = 0; i < childsArr.length; i++)
	{
		var child = childsArr[i];
		
		if (child.type == 'group')
		{
			callback(child, flag, treeElem.content ? treeElem.content.properties.list : treeElem.properties.list, i);
			
			this.findTreeElems(child, callback, flag && child.content.properties.visible, treeElem.content ? treeElem.content.properties.list : treeElem.properties.list)
		}
		else
			callback(child, flag, treeElem.content ? treeElem.content.properties.list : treeElem.properties.list, i);
	}
}

/**
 *  Модифицирует объекты внутри векторного слоя, отправляя изменения на сервер и информируя об этом API
 * 
 * @memberOf _mapHelper
 * @name modifyObjectLayer
 * @function
 * @param {String} layerName Имя слоя
 * @param {Object[]} objs Массив описания объектов. Каждое описание представляет из себя объект:
 * 
 *  * id {String} ID объекта слоя, над которым производятся изменения (только для модификации и удаления)
 *  * geometry Описание геометрии (вставка и изменение)
 *  * source: {rc: <name КР-источника>, rcobj: <id объекта внутри КР>}
 *  * properties Свойства объекта (вставка и изменение)
 *  * action {'delete'|'insert'|'update'} Производимое действие. Если не указано, то вычисляется следующим образом:
 *    * Если не указан id, то вставка
 *    * Если указан id, то модифицируем
 *    * Для удаления объекта нужно явно прописать параметр
*/
mapHelper.prototype.modifyObjectLayer = function(layerName, objs, crs)
{
    var def = $.Deferred();
    
    $.each(objs, function(i, obj)
    {
        obj.action = obj.action || (obj.id ? 'update' : 'insert');
    });
    var params = {
        WrapStyle: 'window', 
        LayerName: layerName, 
        objects: JSON.stringify(objs)
    };
    if (crs) {
        params.geometry_cs = crs;
    }
    sendCrossDomainPostRequest(serverBase + "VectorLayer/ModifyVectorObjects.ashx", 
        params
        ,
        function(addResponse)
        {
            if (!parseResponse(addResponse))
            {
                def.reject();
                return;
            }
            
            var mapLayer = window.globalFlashMap && window.globalFlashMap.layers[layerName];
            if (mapLayer) {
                mapLayer.chkLayerVersion(function()
                {
                    def.resolve();
                });
            }
            else
            {
                def.resolve();
            }
        }
    )
    
    return def.promise();
}

mapHelper.prototype.searchObjectLayer = function(layerName, options) {
    options = options || {};
    
    var def = $.Deferred();
    
    var requestParams = {
        WrapStyle: 'message', 
        layer: layerName
    }
    
    if (options.query) {
        requestParams.query = options.query;
    }
    
    if (options.includeGeometry) {
        requestParams.geometry = true;
    }
    
    if (options.border) {
        requestParams.border = JSON.stringify(options.border);
    }
    
    requestParams.page = options.page || 0;
    requestParams.pagesize = options.pagesize || 100000;
    
    sendCrossDomainPostRequest(serverBase + "VectorLayer/Search.ashx", requestParams, function(response) {
        if (!parseResponse(response)) {
            def.reject(response);
            return;
        }
        var values = response.Result.values;
        var fields = response.Result.fields;
        var objects = [];
        for (var i = 0; i < values.length; i++) {
            var obj = {properties: {}};
            
            for (var p = 0; p < values[i].length; p++) {
                if (fields[p] === 'geomixergeojson') {
                    obj.geometry = values[i][p];
                } else {
                    obj.properties[fields[p]] = values[i][p];
                }
            }
            objects.push(obj);
        }
        
        def.resolve(objects);
    });
    
    return def.promise();
}

var _mapHelper = new mapHelper();

mapHelp.mapHelp.load = function()
{
	var alreadyLoaded = _mapHelper.createWorkCanvas(arguments[0]);
	
	if (!alreadyLoaded)
		_mapHelper.load()
}

mapHelp.mapHelp.unload = function()
{
}

mapHelp.serviceHelp.load = function()
{
	var alreadyLoaded = _serviceHelper.createWorkCanvas(arguments[0]);
	
	if (!alreadyLoaded)
		_serviceHelper.load()
}
mapHelp.serviceHelp.unload = function()
{
}

var serviceHelper = function()
{
	this.builded = false;

}

serviceHelper.prototype = new leftMenu();

serviceHelper.prototype.load = function()
{
	var _this = this;
	if (!this.builded)
	{		
		var fileName;
		
		if (typeof window.gmxViewerUI !== 'undefined' && typeof window.gmxViewerUI.servicesFilePrefix !== 'undefined')
			fileName = window.gmxViewerUI.servicesFilePrefix;
		else
			fileName = window.gmxJSHost ? window.gmxJSHost + "servicesHelp" : "servicesHelp";
		
		fileName += _gtxt("helpPostfix");
		
		_mapHelper._loadHelpTextFromFile(fileName, function( text )
		{
			var div = _div(null, [['dir','className','help']]);
			div.innerHTML = text;
			_(_this.workCanvas, [div]);
		});
		
		this.builded = true;
	}
}	

var _serviceHelper = new serviceHelper();

mapHelp.tabs.load = function()
{
	var alreadyLoaded = _queryTabs.createWorkCanvas(arguments[0]);
	
	if (!alreadyLoaded)
		_queryTabs.load()
}
mapHelp.tabs.unload = function()
{
}

mapHelp.externalMaps.load = function()
{
	var alreadyLoaded = _queryExternalMaps.createWorkCanvas(arguments[0]);
	
	if (!alreadyLoaded)
		_queryExternalMaps.load()
}
mapHelp.externalMaps.unload = function()
{
}

//Динамически подгружаемые части вьюера

//Редактирование мультислоя
nsGmx.createMultiLayerEditorServer = gmxCore.createDeferredFunction('MultiLayerEditor', 'createMultiLayerEditorServer');
nsGmx.createMultiLayerEditorNew = gmxCore.createDeferredFunction('MultiLayerEditor', 'createMultiLayerEditorNew');

//Редактирование карты и группы
nsGmx.addSubGroup = gmxCore.createDeferredFunction('GroupEditor', 'addSubGroup');
nsGmx.createGroupEditor = gmxCore.createDeferredFunction('GroupEditor', 'createGroupEditor');
nsGmx.createMapEditor = gmxCore.createDeferredFunction('GroupEditor', 'createMapEditor');

//Редактирование свойств слоя
nsGmx.createLayerEditor = gmxCore.createDeferredFunction('LayerEditor', 'createLayerEditor');

//Редактирование стилей векторного слоя
nsGmx.createStylesDialog = gmxCore.createDeferredFunction('LayerStylesEditor', 'createStylesDialog');

//Библиотека стилей
nsGmx.showStyleLibraryDialog = gmxCore.createDeferredFunction('StyleLibrary', 'showStyleLibraryDialog');