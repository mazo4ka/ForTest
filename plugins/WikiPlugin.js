﻿
(function wiki($, oFlashMap){
_translationsHash.addtext("rus", {
	"Сообщение" : "Сообщение",
	"Сообщения" : "Сообщения",
	"Искать в видимой области" : "Искать в видимой области",
	"Добавьте объект на карту" : "Добавьте объект на карту",
	"Для подложки" : "Для подложки",
	"Создать сообщение" : "Создать сообщение",
	"Статья Wiki" : "Статья Wiki",
	"Заголовок" : "Заголовок",
	"Сообщение уже редактируется": "Сообщение уже редактируется",
	"Щелкните по слою в дереве слоёв, чтобы выбрать его": "Щелкните по слою в дереве слоёв, чтобы выбрать его",
	"Для добавления или редактирования объекта на карте нужно добавить новый объект - точку или многоугольник из панели инструментов": "Для добавления или редактирования объекта на карте нужно добавить новый объект - точку или многоугольник из панели инструментов"
});
_translationsHash.addtext("eng", {
	"Сообщение" : "Message",
	"Сообщения" : "Messages",
	"Искать в видимой области" : "Only search in visible area",
	"Добавьте объект на карту" : "Add object on map",
	"Для подложки" : "For basemap",
	"Создать сообщение" : "Create message",
	"Статья Wiki" : "Wiki page",
	"Заголовок" : "Title",
	"Сообщение уже редактируется": "Message editor is already open",
	"Щелкните по слою в дереве слоёв, чтобы выбрать его": "Click layer to choose it",
	"Для добавления или редактирования объекта на карте нужно добавить новый объект - точку или многоугольник из панели инструментов": "To add object use toolbar on map"
});

var oWikiDiv = _div(null, [['attr', 'Title', _gtxt("Сообщения")]]);
//Возвращает Ид. карты
var getMapId = function(){
	return oFlashMap.properties.name;
}

/* --------------------------------
 * Function extensions
 * -------------------------------- */
Function.prototype.bind = Function.prototype.bind ||
    function(scope) {
        var fn = this;
        return function() {
            return fn.apply(scope, arguments);
        }
    }

/* --------------------------------
 * jQuery extensions
 * -------------------------------- */
 
var extendJQuery;
extendJQuery = function() { 
    if (typeof $ !== 'undefined') {
        $.getCSS = $.getCSS || function(url) {
            if (document.createStyleSheet) {
                document.createStyleSheet(url);
            } else {
                $("head").append("<link rel='stylesheet' type='text/css' href='" + url + "'>");
            }
        }
    } else {
        setTimeout(extendJQuery, 100);
    }
}
extendJQuery();

var WHOLE_MAP_LAYER_KEY = 'map-scoped';

/* --------------------------------
 * Service to access Wiki
 * -------------------------------- */

WikiService = function(wikiBasePath) {
    this._wikiBasePath = wikiBasePath;
}

WikiService.prototype = {
    getPages: function(callback) {
        this._loadData(this.getWikiLink('GetMessages.ashx?MapName=' + getMapId()), callback);
    },

    getWikiLink: function(relativeUrl) {
        return this._wikiBasePath + relativeUrl;
    },
    
	updatePage: function(pageInfo, callback){
		var _data = {WrapStyle: 'window'
				, MessageID: pageInfo.MessageID.toString()
				, Title: pageInfo.Title
				, Content: pageInfo.Content
				, MapName: pageInfo.MapName
				, LayerName: pageInfo.LayerName
				, Geometry: JSON.stringify(pageInfo.Geometry)
				, AuthorLogin: pageInfo.AuthorLogin
				, IsDeleted: pageInfo.IsDeleted
		};
			
		sendCrossDomainPostRequest(this.getWikiLink('UpdateMessage.ashx'), _data, function(data) { if (parseResponse(data) && callback) callback(data); });
	},
	
    _loadData: function(url, callback) {
        $.ajax({
            url: url+ (url.indexOf('?') >= 0 ? '&' : '?') + 'callbackName=?',
            dataType: 'json',
            success: function(data) { if (parseResponse(data) && callback) callback('ok', data); }.bind(this),
            error: function() { if (callback) callback('error'); }.bind(this)
        });
    }
}

/* --------------------------------
 * Handles wiki objects on map
 * -------------------------------- */
WikiObjectsHandler = function(map, wikiPlugin) {
    this._map = map;
    this._wikiPlugin = wikiPlugin;
    
    this._objectsCache = {};
	this._pageLayer = map.addObject();
}

WikiObjectsHandler.prototype = {
    createObjects: function(objects) {
        
		for (var objectIndex = 0; objectIndex < objects.length; ++objectIndex) {
			this._createObject(objects[objectIndex]);
		}
    },

	_createObject: function(pageInfo){
		var mapObject;
		if (pageInfo.LayerName && !this._map.layers[pageInfo.LayerName]){pageInfo.BadLayer = true; return;}

		if (!this._objectsCache[pageInfo.LayerName]) {
			this._objectsCache[pageInfo.LayerName] = this._pageLayer.addObject();
			if(pageInfo.LayerName) this._objectsCache[pageInfo.LayerName].setVisible(this._map.layers[pageInfo.LayerName].isVisible); 
		}
		mapObject = this._objectsCache[pageInfo.LayerName].addObject(pageInfo.Geometry);
		pageInfo.mapObject = mapObject;
		mapObject.enableHoverBalloon(this._getBaloon(pageInfo));
		switch (pageInfo.Geometry.type) {
			case 'POINT':
				mapObject.setStyle({ marker: { image: (pageInfo.IconUrl ? pageInfo.IconUrl : getAPIHostRoot() + "/api/plugins/img/wiki/page.gif"), center: true }});
				break;
			case 'POLYGON':
				mapObject.setStyle({outline: {thickness: 1, opacity: 100}});
				break;
		}
	},
	
	_getBaloon: function(pageInfo){
		var _this = this;
		return function(attr, div) { 
					var divEdit = _div();
					if (userInfo().Login == pageInfo.AuthorLogin || nsMapCommon.AuthorizationManager.isRole(nsMapCommon.AuthorizationManager.ROLE_ADMIN)){
						var btnEdit = makeLinkButton(_gtxt("Редактировать"));
						var btnDelete = makeLinkButton(_gtxt("Удалить"));
						btnEdit.onclick = function() {_this._wikiPlugin.openEditor(pageInfo); _this._map.balloonClassObject.hideHoverBalloons(); }
						btnDelete.onclick = function() {_this._wikiPlugin.deletePage(pageInfo); _this._map.balloonClassObject.hideHoverBalloons(); }
						_(divEdit, [btnEdit, _t(" "), btnDelete]);
					};
					var divTitle = _div([_t(pageInfo.Title)], [['dir', 'className', 'wiki-message-title']]);
					var divContent = _div();
					divContent.innerHTML = pageInfo.Content;
					var divBaloon = _div([divTitle, divContent, divEdit]);
					
					removeChilds(div); 
					_(div, [divBaloon]);
					return {}; 
				};
	},
	        
    removeObjects: function() {
        if (this._objectsCache.length == 0) return;
        for (var layerName in this._objectsCache) {
            this._objectsCache[layerName].remove();
        }
        this._objectsCache = {};
    },
	
	setObjectsVisibility: function(isVisible) {
        this[isVisible ? 'showObjects' : 'hideObjects']();
    },
    
	setLayerVisible: function(layerName, isVisible){
		this._objectsCache[layerName] && this._objectsCache[layerName].setVisible(isVisible);
	},
	
    showObjects: function() {
		this._pageLayer.setVisible(true);
    },
    
    hideObjects: function() {
        this._pageLayer.setVisible(false);
    }
}


WikiFilter = function(oContainer){
	this._container = oContainer;
	this._input = _input(null);
	this._list = _div(null, [['dir', 'className', 'wiki-filter-canvas']]);
	this._checkExtent = _checkbox(false, 'checkbox');
	this._checkExtent.id = 'wiki-filter-area-checkbox';
	this.pagesCache=[];
	
	this._initialize();
}

WikiFilter.prototype = {
	_initialize: function(){
		var _this = this;
		var label = _label([_t(_gtxt("Искать в видимой области"))], [['attr', 'for', 'wiki-filter-area-checkbox']]);
		var table = _table([_tbody([_tr([_td([this._input]), _td([this._checkExtent]), _td([label])])])], [['dir', 'className', 'wiki-filter-input']]);
		$(this._container).append(table);
		//$(this._container).append(_span([])], [['css', 'margin-top', '10px']]));
		$(this._container).append(this._list);
		var fnFilter = function(){ return _this.filter();}
		this._checkExtent.onclick = function(){ 
			if (this.checked) {
				oFlashMap.setHandler("onMove", fnFilter);
			}
			else{
				oFlashMap.removeHandler("onMove", fnFilter);
			}
			return _this.filter();
		};
		this._input.onkeyup = fnFilter;
	},
	filter: function(){
		var _this = this;
		var sFilter = new RegExp(this._input.value, "i");
		removeChilds(this._list);
		//var arrTopicsLI = {};
		for(var i=0; i<this.pagesCache.length; i++){
			var page = this.pagesCache[i];
			var layerOK = !page.BadLayer && (!page.LayerID || oFlashMap.layers[page.LayerID].isVisible)
			var extentOK = !this._checkExtent.checked || boundsIntersect(getBounds(page.Geometry.coordinates), oFlashMap.getVisibleExtent());
			if ( layerOK && extentOK && (!sFilter /*|| page.TopicName.match(sFilter)*/ || page.Title.match(sFilter))){
				/*if (!arrTopicsLI[page.TopicName]){
					arrTopicsLI[page.TopicName]=_li([_div([_span([_t(page.TopicName)], [['dir', 'className', 'wiki-filter-topic']])])]);
					$(this._list).append(_ul([arrTopicsLI[page.TopicName]]));
				}*/
				var oPageRow = _span([_t(page.Title)], [['dir', 'className', 'wiki-filter-page']]);
				oPageRow.PageInfo = page;
				oPageRow.onclick = function(){
					oFlashMap.setMinMaxZoom(1, 13);
					var oExtent = getBounds(this.PageInfo.Geometry.coordinates);
					oFlashMap.zoomToExtent(oExtent.minX, oExtent.minY, oExtent.maxX, oExtent.maxY);
					oFlashMap.setMinMaxZoom(1, 17);
				}
				//$(arrTopicsLI[page.TopicName]).
				$(this._list).append(_ul([oPageRow]));
			}
		}
		$(this._list).treeview();
	}
}


window.tinyMCEPreInit = {
	base: getAPIHostRoot() + '/api/plugins/tiny_mce', 
	suffix : '', 
	query : ''
};      

var tinyMCELoaded = false;
var InitEditor = function(target) {
    var options = {
        language : "ru",
        mode: 'exact',
        theme: 'advanced',
        elements: target,
        //relative_urls : false,
        
        theme_advanced_buttons1 : "bold,italic,underline,strikethrough,|,justifyleft,justifycenter,justifyright,justifyfull,|,formatselect,fontselect,fontsizeselect",
        theme_advanced_buttons2 : "bullist,numlist,|,outdent,indent,|,undo,redo,|,link,unlink,anchor,image,cleanup,help,code",
        theme_advanced_buttons3 : "hr,removeformat,visualaid,|,sub,sup,|,charmap",
        theme_advanced_toolbar_location : "top",
        theme_advanced_toolbar_align : "left",
        theme_advanced_statusbar_location : "bottom",
        
        plugins: 'advimage',
        extended_valid_elements: 'img[!src|border:0|alt|title|width|height|style]a[name|href|target|title|onclick]'
    };

    //if (fileBrowser) options.file_browser_callback = "fileBrowser.open";
	
	if(!tinyMCELoaded) {
		$LAB.script(getAPIHostRoot() + "/api/plugins/tiny_mce/tiny_mce_src.js").wait(function(){
			tinyMCELoaded = true;
			tinymce.dom.Event.domLoaded = true; 
			tinyMCE.init(options);
		});
	}
	else{
		tinyMCE.init(options);
	}
}


WikiEditor = function(pageInfo, wikiPlugin){
	this._wikiPlugin = wikiPlugin;
	this._pageInfo = pageInfo;
	this._layerChooseFlag = false;
	this._geometryChooseFlag = false;
	this._divGeometry = _div([_t(_gtxt("Для добавления или редактирования объекта на карте нужно добавить новый объект - точку или многоугольник из панели инструментов"))]);
	this._txtLayer = _input(null, [['attr', 'readonly', 'true'], ['dir', 'className', 'wiki-editor-txtlayer']]);
	this._lblLayer = _t(_gtxt("Щелкните по слою в дереве слоёв, чтобы выбрать его"));
	this._txtTitle = _input(null, [['dir', 'className', 'wiki-editor-txttitle']]);
	this._fieldsTable = _table([_tbody([_tr([_td([_t(_gtxt("Слой"))]), _td([this._txtLayer]), _td([this._lblLayer])]), _tr([_td([_t(_gtxt("Заголовок"))]), _td([this._txtTitle]), _td()])])], [['css', 'border-spacing', '2']]);
	this._txtContent = _textarea(null, [['attr', 'id', 'message_content']]);
	if (pageInfo.LayerName) this._txtLayer.value = this._wikiPlugin._map.layers[pageInfo.LayerName].properties.title;
	if (pageInfo.Title) this._txtTitle.value = pageInfo.Title;		
	if (pageInfo.Content) this._txtContent.value = pageInfo.Content;
	var _btnOK = _button([_t(_gtxt("Сохранить"))], [['dir', 'className', 'wiki-editor-btnok']]);
	_btnOK.onclick = this.updatePage.bind(this);
	this._div = _div([this._divGeometry, this._fieldsTable, this._txtContent, _br(), _btnOK], [['attr', 'Title', _gtxt('Сообщение')]]);
	
}

WikiEditor.prototype = {
	showDialog: function(){
		var _this = this;
		this._dialog = showDialog(_gtxt('Сообщение'), this._div, 500, 350 , false, false, false, function(){ $(_this).triggerHandler('dialogclose'); if (_this._drawing) _this._drawing.remove();})
		//$(this._div).dialog({height: 350, width: 500, close: );
		InitEditor('message_content');
	},
	
	updatePage: function(){
		this._pageInfo.Title = this._txtTitle.value;
		tinyMCE.get('message_content').save();
		this._pageInfo.Content = this._txtContent.value;
		if (this._drawing) {
			this._pageInfo.Geometry = this._drawing.geometry;
			this._drawing.remove();
			this._drawing = null;
		}
		if (!this._pageInfo.Geometry) { alert("Добавьте объект на карту"); return; };
		$(this).triggerHandler('updatePage', [this._pageInfo]);
	},
	
	setGeometry: function(drawing){
		if (drawing && this._drawing) this._drawing.remove();
		this._drawing = drawing;
	},
	
	setLayer: function(layerName){
		this._txtLayer.value = this._wikiPlugin._map.layers[layerName].properties.title;
		this._pageInfo.LayerName = layerName;
	},
	
	closeDialog: function(){
		$(this._dialog).dialog('close');
	}
}

/* --------------------------------
 * Plug-in for Wiki integration
 * -------------------------------- */
WikiPlugin = function() {
    this._wikiService = null;
    this._wikiObjects = null;
	this._wikiEditor = null;
    this._pagesCache = [];
    this._map = null;
	
    this._treeView = null;
	this._uiWikiButton = null;
    
    this._createButton = null;
    this._filter = null;
}

WikiPlugin.prototype = {
    initialize: function(map, sWikiServer, oMapDiv) {
        $.getCSS(getAPIHostRoot() + '/api/plugins/WikiPlugin.css');
		this._map = map;
        this._wikiService = new WikiService(sWikiServer);
        this._wikiObjects = new WikiObjectsHandler(this._map, this);

		this._addButton();
		this._attachTreeEvents();
        this._attachDrawingObjectsEvents();
        this._treeView = $('ul.treeview');
		this._filter = new WikiFilter(oWikiDiv);

		this._map.drawing.addTool('sendMessage'
									, _gtxt("Создать сообщение")
									, 'plugins/img/wiki/sendMessage.png'
									, 'plugins/img/wiki/sendMessage_a.png'
									, function(){this._map.drawing.selectTool('move'); this.createPage(); }.bind(this)
									, function(){})
		this._updatePages();
    },
    
	createPage: function(layerID){
		if (this._isUserLoggedIn()) {
			this.openEditor({MessageID: -1, MapName: getMapId(), LayerName: layerID, AuthorLogin: userInfo().Login, IsDeleted: 0});
		}
		else {
			$('.loginCanvas div.log span.buttonLink').click();
		}
	},
	
	openEditor: function(pageInfo){
		if (this._wikiEditor){
			alert(_gtxt("Сообщение уже редактируется"));
		}
		else{
			var _this = this;
			this._wikiEditor = new WikiEditor(pageInfo, this);
			$(this._wikiEditor).bind('dialogclose', function(){
					_this._wikiEditor = null;
				});
			$(this._wikiEditor).bind('updatePage', function(){
					_this._wikiService.updatePage(pageInfo, function(response) { _this._updatePages(); _this._wikiEditor.closeDialog();  } );
				});
			this._wikiEditor.showDialog();
		}
	},
    
	deletePage: function(pageInfo){
		var _this = this;
		pageInfo.IsDeleted = 1;
		this._wikiService.updatePage(pageInfo, function(response) { _this._updatePages(); } );
	},
	
    _isUserLoggedIn: function() {
        return !!userInfo().Login;
    },
       
    /* #region: queryDrawingObjects overrides */
	_addButton: function(){
        var clickFunction = function() {
					this.createPage();
                }.bind(this);
		
		this._createButton = $('<span class="wiki-wizard-button">' + _gtxt("Создать сообщение") + '</span>').click(clickFunction);
		$(oWikiDiv).append($('<div class="wiki-wizard-button"></div>').append(this._createButton));
	},
	
    _attachDrawingObjectsEvents: function() {
        if (!this._isUserLoggedIn()) return;
    
        // Fix objects created before plugin started, e.g. from permalink
        /*this._map.drawing.forEachObject(function(drawingObject) {
            this._onDrawingObjectAdded(drawingObject);
        }.bind(this));*/
    
        this._map.drawing.setHandlers({
		    onAdd: this._onDrawingObjectAdded.bind(this),
			onRemove: this._onDrawingObjectRemove.bind(this)
		});
    },
    
    _onDrawingObjectAdded: function(elem) {
        if (elem.geometry.type != 'POINT' &&
            elem.geometry.type != 'POLYGON') return;
			
		if(this._wikiEditor) {
			this._wikiEditor.setGeometry(elem);
			var style = elem.getStyle();
			style.regular.outline.color = 0x007700;
			style.hovered.outline.color = 0x009900;
			elem.setStyle(style.regular, style.hovered);
		}
    },
	
	_onDrawingObjectRemove: function(){
		if(this._wikiEditor) this._wikiEditor.setGeometry(null);
	},
	
	_attachTreeEvents: function() {
        var that = this;
                
        var oldLayerVisible = layersTree.prototype.layerVisible;
        layersTree.prototype.layerVisible = function(box, flag) {
            (oldLayerVisible.bind(this))(box, flag);
            var layerInfo = box.parentNode.properties.content.properties;
            if(that._wikiObjects) that._wikiObjects.setLayerVisible(layerInfo.name, layerInfo.visible);
			if(that._wikiEditor) that._wikiEditor.setLayer(layerInfo.name);

			that._filter.filter();
        }
    },
    
    _createPage: function(mapId, layerId, drawingObject) {
        var pageInfo = {};
		if(drawingObject){
			pageInfo.Geometry = this._getObjectGeometry(drawingObject);
			drawingObject.remove();			
		}
        this.openEditor(pageInfo);
    },

	_ensureWikiButton: function() {
        if (!this._pagesCache || !this._pagesCache.length) return;        
        if (!this._uiWikiButton) {
            this._uiWikiButton = $('<div class="wiki-button" title="Показать/скрыть статьи Wiki на карте" />')
                .addClass('page-button-on')
                .click(function() { this._toggleWikiObjectsVisibility(); }.bind(this));
        }
        this._treeView.find('div[mapid="' + this._map.properties.MapID + '"] div:first').append(this._uiWikiButton);
    },
    
    _toggleWikiObjectsVisibility: function() {
        this._wikiObjects.setObjectsVisibility( 
            this._isWikiButtonOn(this._uiWikiButton.toggleClass('page-button-on').toggleClass('page-button-off'))
        );
    },
	
	_setWikiButtonState: function(button, isOn) {
        if (!button) return;
        button.removeClass('page-button-on page-button-off').addClass('page-button-' + (isOn ? 'on' : 'off'));
    },
    
    _isWikiButtonOn: function(button) {
        return button && button.length && button.hasClass('page-button-on');
    },
    
    _updatePages: function() {
		var _this = this;
		var objects = this._wikiObjects;
        objects.removeObjects();
		
        this._wikiService.getPages(function(status, data){
			if (status != 'ok' || data.Status != 'ok') {
				// Something went wrong
				_this._pagesCache = [];
				return;
			}
			data.Result.sort(function (page_a, page_b){
				if (page_a == null || page_a == null) return 0;
				if (page_a.Title > page_b.Title )
					return 1;
				if (page_a.Title  < page_b.Title )
					return -1;
				return 0;
			});
			_this._pagesCache = data.Result;
			for (var index = 0; index < _this._pagesCache.length; ++index) {
				_this._pagesCache[index].Geometry = _this._pagesCache[index].wkb_geometry;
			}

			objects.createObjects(_this._pagesCache);
			
			_this._filter.pagesCache = _this._pagesCache;
			_this._filter.filter();
			
			_this._ensureWikiButton();
		});
    }
}

var oWiki = new WikiPlugin();
var oWikiLeftMenu = new leftMenu();
var alreadyLoaded = false;
var loadMenu = function(){
	$(oWikiDiv).dialog();
	
	//oWikiLeftMenu.createWorkCanvas("wiki", unloadMenu);
	//$(oWikiLeftMenu.workCanvas).after(oWikiDiv);
}

var unloadMenu = function(){
}

var beforeViewer = function(params){
	nsGmx.ContextMenuController.addContextMenuElem({
		title: _gtxt("Создать сообщение"),
		isVisible: function(context)
		{
			return userInfo().Login;
		},
		isSeparatorBefore: function(layerManagerFlag, elem)
		{
			return true;
		},
		clickCallback: function(context)
		{
			if(context.elem && context.elem.LayerID)
				oWiki.createPage(context.elem.name);
			else
				oWiki.createPage();
		}
	}, ['Layer', 'Map']);
}

var afterViewer = function(params){
	oWiki.initialize(oFlashMap, params.WikiServer, params.MapDiv);
}

var addMenuItems = function(){
	return [{item: {id:'wiki', title:_gtxt('Сообщения'),func:loadMenu},
			parentID: 'viewMenu'}];
}
 
var publicInterface = {
	beforeViewer: beforeViewer,
	afterViewer: afterViewer,
	addMenuItems: addMenuItems
}

gmxCore.addModule("wiki", publicInterface);

})(jQuery, globalFlashMap)