﻿var globalFlashMap;

var nsGmx = nsGmx || {};
nsGmx.widgets = nsGmx.widgets || {};

(function(){

var gmxJSHost = window.gmxJSHost || "";

function parseUri(str) 
{
	var	o   = parseUri.options,
		m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
		uri = {},
		i   = 14;

	while (i--) uri[o.key[i]] = m[i] || "";

	uri[o.q.name] = {};
	uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
		if ($1) uri[o.q.name][$1] = $2;
	});

	uri.hostOnly = uri.host;
	uri.host = uri.authority; // HACK

	return uri;
};

parseUri.options = {
	strictMode: false,
	key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
	q:   {
		name:   "queryKey",
		parser: /(?:^|&)([^&=]*)=?([^&]*)/g
	},
	parser: {
		strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
		loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
	}
};

var _mapHostName = window.mapHostName ? "http://" + window.mapHostName + "/api/" : parseUri(window.location.href).directory;
var _serverBase = window.serverBase || /(.*)\/[^\/]*\//.exec(_mapHostName)[1] + '/';

//подставляет к локальному имени файла хост (window.gmxJSHost) и, опционально, рандомное поле для сброса кэша (window.gmxDropBrowserCache)
var _getFileName = function( localName )
{
	return gmxJSHost + localName + ( window.gmxDropBrowserCache ? "?" + Math.random() : "");
}

//последовательно загружает все файлы js из jsLoadSchedule.txt и вызывает после этого callback
var loadJS = function(callback)
{
    var process = function(fileList)
    {
        var LABInstance = $LAB;
		
		for (var f = 0; f < fileList.length-1; f++)
			LABInstance = LABInstance.script(_getFileName(fileList[f])).wait();
			
		LABInstance.script(_getFileName(fileList[fileList.length-1])).wait(callback);
    }
    
    var fileName = gmxJSHost + "jsLoadSchedule.txt";
    
    var filesToLoad = [/*#buildinclude<load_js.txt>*/];
    
    //если система сборки не вставила явно список файлов вьюера, попробуем его загрузить из внешнего файла...
    if (filesToLoad.length === 0)
    {
        if (fileName.indexOf("http://") === 0)
        {
            $.getJSON(_serverBase + "ApiSave.ashx?CallbackName=?&get=" + encodeURIComponent(fileName), function(response)
            {
                process(eval(response.Result));
            });
        }
        else
            $.getJSON(fileName, process);
    }
    else
        process(filesToLoad);
}

$LAB.
	script(_getFileName("jquery/jquery-1.5.1.min.js")).wait().
	script(_getFileName("jquery/jquery.getCSS.js")).wait(function()
	{
		$.getCSS(_getFileName("common.css"));
		$.getCSS(_getFileName("jquery/jquery-ui-1.7.2.custom.css"));
		$.getCSS(_getFileName("colorpicker/css/colorpicker.css"));
		$.getCSS(_getFileName("menu.css"));
		$.getCSS(_getFileName("table.css"));
		$.getCSS(_getFileName("buttons.css"));
		$.getCSS(_getFileName("treeview.css"));
		$.getCSS(_getFileName("search.css"));
	}).
	script(_getFileName("jquery/jquery-ui-1.8.10.custom.min.js")).wait().
	script(_getFileName("jquery/ui.datepicker-ru.js")).wait().
	script(_getFileName("jquery/jquery.treeview.js")).wait().
	
	script(_getFileName("colorpicker/js/colorpicker.js")).wait().
	script(_getFileName("colorpicker/js/eye.js")).wait().
	script(_getFileName("colorpicker/js/utils.js")).wait(function(){
	
loadJS(function(){

var oSearchLeftMenu = new leftMenu();
				
gmxCore.loadModule("search", _getFileName("search.js"));
gmxCore.addModulesCallback(["search"], function(){
	var oSearchModule = gmxCore.getModule("search");
	window.oSearchControl = new oSearchModule.SearchGeomixer();
});
gmxCore.addModulesCallback(["DrawingObjects"], function(){
	var oDrawingObjectsModule = gmxCore.getModule("DrawingObjects");
	window.oDrawingObjectGeomixer = new oDrawingObjectsModule.DrawingObjectGeomixer();
});

//Инициализация элементов управления
var fnInitControls = function(){
	window.oSearchControl.Init({
		Menu: oSearchLeftMenu,
		ContainerInput: document.getElementById('searchCanvas'),
		ServerBase: globalFlashMap.geoSearchAPIRoot,
		layersSearchFlag: true,
		mapHelper: _mapHelper,
		Map: globalFlashMap
	});
	window.oDrawingObjectGeomixer.Init();
}
// используется для сохранения специфичных параметров в пермалинке
window.collectCustomParams = function()
{
	return null;
}

var createMenu = function()
{
	_menuUp.submenus = {};
	
	_menuUp.addItem(
	{id:"mapsMenu", title:_gtxt("Карта"),childs:
		[
			{id:'mapCreate', title:_gtxt('Создать'),func:function(){_queryMapLayers.createMapDialog(_gtxt("Создать карту"), _gtxt("Создать"), _queryMapLayers.createMap)}},
			{id:'mapList', title:_gtxt('Открыть'),func:function(){_queryMapLayers.getMaps()}, style: [['css','borderBottom','1px solid #E6F1F5']]},
			{id:'mapSave', title:_gtxt('Сохранить'),func:_queryMapLayers.saveMap},
			{id:'mapSaveAs', title:_gtxt('Сохранить как'),func:function(){_queryMapLayers.createMapDialog(_gtxt("Сохранить карту как"), _gtxt("Сохранить"), _queryMapLayers.saveMapAs)}},
			{id:'permalink', title:_gtxt('Ссылка на карту'),func:function(){_mapHelper.showPermalink()}, style: [['css','borderBottom','1px solid #E6F1F5']]},
			{id:'mapTabsNew', title:_gtxt('Добавить закладку'),func:function(){mapHelp.tabs.load('mapTabs');_queryTabs.add();}},
			{id:'codeMap', title:_gtxt('Код для вставки'),func:function(){_mapHelper.createAPIMapDialog()}},
			{id:'printMap', title:_gtxt('Печать'),func:function(){_mapHelper.print()}}
		]});
	
	_menuUp.addItem(
	{id:"layersMenu", title:_gtxt("Слой"),childs:
		[
			{id:'layerList', title:_gtxt('Открыть'),func:function(){_queryMapLayers.getLayers()}},
			{id:'layersVector', title:_gtxt('Создать векторный слой'),func:function(){_mapHelper.createNewLayer("Vector")}},
			{id:'layersRaster', title:_gtxt('Создать растровый слой'),func:function(){_mapHelper.createNewLayer("Raster")}},
			{id:'layersMultiRaster', title:_gtxt('Создать мультислой'),func:function(){_mapHelper.createNewLayer("Multi")}}
		]});
	
	_menuUp.addItem(
	{id:"viewMenu", title:_gtxt("Вид"),childs:
		[
			{id:'layers', title:_gtxt('Дерево слоев'),onsel:mapLayers.mapLayers.load,onunsel:mapLayers.mapLayers.unload},
			{id:'externalMaps', title:_gtxt('Дополнительные карты'),onsel:mapHelp.externalMaps.load,onunsel:mapHelp.externalMaps.unload},
			{id:'DrawingObjects', title:_gtxt('Объекты на карте'),onsel: oDrawingObjectGeomixer.Load, onunsel: oDrawingObjectGeomixer.Unload},
			{id:'search', title:_gtxt('Результаты поиска'), onsel: oSearchControl.Load,onunsel:oSearchControl.Unload},
			{id:'mapTabs', title:_gtxt('Закладки'),onsel:mapHelp.tabs.load,onunsel:mapHelp.tabs.unload}
		]});
	
	_menuUp.addItem(
	{id:"instrumentsMenu", title:_gtxt("Инструменты"),childs:
		[
			{id:'layersList', title:_gtxt('Поиск слоев'),onsel:mapLayers.mapLayersList.load,onunsel:mapLayers.mapLayersList.unload},
			{id:'mapGrid', title:_gtxt('Координатная сетка'), func:function(){_mapHelper.gridView = !_mapHelper.gridView; globalFlashMap.grid.setVisible(_mapHelper.gridView);}}
		]});
	
	var services = [];
	
	if (typeof useCatalog != 'undefined' && useCatalog)
	{
		var catalogTab = function()
		{
		}
		
		catalogTab.prototype = new leftMenu();
		
		catalogTab.prototype.load = function(params)
		{
		    if (!this.builded)
		    {
		    	var _this = this;
		    	
				$.getScript((window.mapHostName ? ("http://" + window.mapHostName + "/api/catalog/") : parseUri(window.location.href).directory + "catalog/") + 'js/CatalogPageController.js', function()
				{
					window.pageController = new CatalogPageController({
				        View: _this.workCanvas,
				        Map: globalFlashMap,
				        TreeView: null,
				        Params: params
				    });
				});
				
				this.builded = true;
			}
		}
		
		window._catalogTab = new catalogTab();
		
		window.closeCatalog = function(){}
		window.reloadCatalog = function(){}
		window.unloadCatalog = function(){}
		
		window.catalogTabPage = {};
		catalogTabPage.load = function()
		{
		    var alreadyLoaded = _catalogTab.createWorkCanvas(arguments[0], closeCatalog);
		   
		    if (!alreadyLoaded)
		        _catalogTab.load(arguments.length > 1 ? arguments[1]: null)
		    else
				reloadCatalog();
		}
		catalogTabPage.unload = function()
		{
			unloadCatalog()
		}
		
		_translationsHash.hash["rus"]["Поиск снимков"] = "Поиск снимков";
		_translationsHash.hash["eng"]["Поиск снимков"] = "Search imagery";
		
		services.push({id:'searchCatalog', title:_gtxt("Поиск снимков"),onsel:catalogTabPage.load,onunsel:catalogTabPage.unload})
	}
	
	if (typeof useFiresMap != 'undefined' && useFiresMap.hostName && useFiresMap.mapName)
	{
		services.push({id:'operative', title:'Оперативный мониторинг', childs:
			[
				{id:'firesMap', title:'Карта пожаров',func:function()
				{
					mapHelp.externalMaps.load("externalMaps")
					
					var existsFlag = false;
					
					$(_queryExternalMaps.workCanvas.lastChild).children("div").each(function()
					{
						if (this.hostName == useFiresMap.hostName &&
							this.mapName == useFiresMap.mapName)
							existsFlag = true;
					});
					
					if (existsFlag)
						return;
						
					_queryExternalMaps.addMapElem(useFiresMap.hostName, useFiresMap.mapName);
				}}
			]})
	}
	
	services = services.concat([
			{id:'shp', title:_gtxt('Загрузить файл'),onsel:drawingObjects.loadShp.load,onunsel:drawingObjects.loadShp.unload},
			{id:'kml', title:_gtxt('Загрузить KML'),onsel:KML.KML.load,onunsel:KML.KML.unload},
			{id:'loadServerData', title:_gtxt('Загрузить данные'), childs:
				[
					{id:'wfs', title:_gtxt('WFS сервер'),onsel:loadServerData.WFS.load,onunsel:loadServerData.WFS.unload},
					{id:'wms', title:_gtxt('WMS сервер'),onsel:loadServerData.WMS.load,onunsel:loadServerData.WMS.unload}
				]}
		//	{id:'pictureBinding', title:_gtxt('Привязать изображение'),onsel:pointsBinding.pointsBinding.load,onunsel:pointsBinding.pointsBinding.unload}
		//	{id:'request', title:_gtxt('Сообщить об ошибке на карте'),func:_mapHelper.userFeedback, disabled: true}
		//	{id:'gps', title:'Спутниковый мониторинг',onsel:gps.gps.load,onunsel:gps.gps.unload}
		]);
	
	_menuUp.addItem(
	{id:"servicesMenu", title:_gtxt("Сервисы"),childs:services});
	
	_menuUp.addItem(
	{id:"helpMenu", title:_gtxt("Справка"),childs:
		[
			{id:'usage', title:_gtxt('Использование'),onsel:mapHelp.mapHelp.load,onunsel:mapHelp.mapHelp.unload},
			{id:'serviceHelp', title:_gtxt('Сервисы'),onsel:mapHelp.serviceHelp.load,onunsel:mapHelp.serviceHelp.unload},
			{id:'about', title:_gtxt('О проекте'),func:_mapHelper.version}
		]});
}

var createDefaultMenu = function()
{
	_menuUp.submenus = {};
	
	_menuUp.addItem(
	{id:"mapsMenu", title:_gtxt("Карта"),childs:
		[
			{id:'mapCreate', title:_gtxt('Создать'),func:function(){_queryMapLayers.createMapDialog(_gtxt("Создать карту"), _gtxt("Создать"), _queryMapLayers.createMap)}},
			{id:'mapList', title:_gtxt('Открыть'),func:function(){_queryMapLayers.getMaps()}}
		]});
	
	_menuUp.addItem(
	{id:"helpMenu", title:_gtxt("Справка"),childs:
		[
			{id:'usage', title:_gtxt('Использование'),onsel:mapHelp.mapHelp.load,onunsel:mapHelp.mapHelp.unload},
			{id:'serviceHelp', title:_gtxt('Сервисы'),onsel:mapHelp.serviceHelp.load,onunsel:mapHelp.serviceHelp.unload},
			{id:'about', title:_gtxt('О проекте'),func:_mapHelper.version}
		]});
}

function createHeader()
{
	var logoDivClass = (typeof window.gmxViewerUI != 'undefined' &&  window.gmxViewerUI.hideLogo) ? 'emptyLogo' : 'logo';
	var logoDiv = _div(null, [['dir','className', logoDivClass],['attr','hidable',true]]);
	
	if ( typeof window.gmxViewerUI != 'undefined' &&  window.gmxViewerUI.logoImage )
		logoDiv.style.background = "transparent url(" + window.gmxViewerUI.logoImage + ") no-repeat scroll 0 0";
	
	var td = _td(null, [['attr','vAlign','top']]),
		table = _table([_tbody([_tr([_td([logoDiv, _div(null,[['dir','className','leftIconPanel'],['attr','id','leftIconPanel']])],[['css','width','360px'],['attr','vAlign','top'],['css','background','transparent url(img/gradHeader.png) repeat-x 0px 0px']]),
									 td])])],[['css','width','100%']]);
	
	_(td, [_div([_div(null, [['attr','id','headerLinks'],['dir','className','headerLinks']]),
		   _div(null, [['attr','id','menu'],['dir','className','upMenu']])], [['css','background','transparent url(img/gradHeader.png) repeat-x 0px 0px'],['attr','hidable',true]]),
		   _div(null, [['attr','id','iconPanel'],['dir','className','iconPanel']])]);
	
	_($$('header'), [table])
	
	var loading = _table([_tbody([_tr([_td([_img(null, [['attr','src','img/loader.gif']])],[['attr','vAlign','center'],['css','textAlign','center']])])])], [['css','width','100%'],['css','height','100%']]);
	
	_($$('flash'), [loading]);
}

$(document).ready(function()
{
	var sessionLang = readCookie("language");
	if (sessionLang)
		window.language = sessionLang;
	else
		window.language = (typeof defaultLang != 'undefined') ? defaultLang : "rus";
	
	if (window.language == "eng")
		window.KOSMOSNIMKI_LANGUAGE = "English";
	
	window.shownTitle =  typeof pageTitle !== 'undefined' && pageTitle ? pageTitle : _gtxt('ScanEx Web Geomixer - просмотр карты');
	
	createHeader();
	
	var upload = document.createElement("script");
	upload.setAttribute("charset", "windows-1251");
	upload.setAttribute("src", (window.mapHostName ? ("http://" + window.mapHostName + "/api/uploader.js") : parseUri(window.location.href).directory + "uploader.js"));
	document.getElementsByTagName("head").item(0).appendChild(upload);
    
    var params = [];
    if (window.apiKey) params.push("key=" + window.apiKey);
    if (window.gmxDropBrowserCache) params.push(Math.random());
    var paramsString = "";
    for (var p = 0; p < params.length; p++)
        paramsString += (paramsString.length ? "&" : "?") + params[p];
    
	var script = document.createElement("script");
	script.setAttribute("charset", "windows-1251");
	script.setAttribute(
		"src", 
		(window.mapHostName ? ("http://" + window.mapHostName + "/api/api.js") : parseUri(window.location.href).directory + "api.js") + paramsString
	);
	var interval = setInterval(function()
	{
		if (window.createFlashMap)
		{
			clearInterval(interval);
			parseReferences();
		}
	}, 200);
	document.getElementsByTagName("head").item(0).appendChild(script);
});

function parseReferences()
{
	window.documentHref = window.location.href.split("?")[0];
	
	var q = window.location.search,
		kvp = (q.length > 1) ? q.substring(1).split("&") : [];
	
	for (var i = 0; i < kvp.length; i++)
		kvp[i] = kvp[i].split("=");
	
	var params = {},
		givenMapName = false;
	
	for (var j in kvp)
	{
		if (kvp[j].length == 1)
		{
			if (!givenMapName)
				givenMapName = kvp[j][0];
		}
		else
			params[kvp[j][0]] = kvp[j][1];
	}
	if (params["permalink"])
	{
		eraseCookie("TinyReference");
		createCookie("TinyReference", params["permalink"]);
		
		window.location.replace(documentHref + (givenMapName ? ("?" + givenMapName) : ""));
		return;
	}
	
	var defaultState = { isFullScreen: params["fullscreen"] == "true" || params["fullscreen"] == "false" ? params["fullscreen"] : "false" };
	
	if ("x" in params && "y" in params && "z" in params &&
		!isNaN(Number(params.x)) && !isNaN(Number(params.y)) && !isNaN(Number(params.z)))
		defaultState.position = {x: Number(params.x), y: Number(params.y), z: Number(params.z)}
	
	if ("mx" in params && "my" in params &&
		!isNaN(Number(params.mx)) && !isNaN(Number(params.my)))
		defaultState.marker = {mx: Number(params.mx), my: Number(params.my), mt: "mt" in params ? params.mt : false}
	
	if ("mode" in params)
		defaultState.mode = params.mode;
	
	window.defaultMapID = typeof window.defaultMapID !== 'undefined' ? window.defaultMapID : 'DefaultMap';
	
	var mapName = window.defaultMapID && !givenMapName ? window.defaultMapID : givenMapName;
	window.globalMapName = mapName;
	
	if (!window.globalMapName)
	{
		// нужно прописать дефолтную карту в конфиге
		
		alert(_gtxt("$$phrase$$_1"))
		
		return;
	}
	else
		checkUserInfo(defaultState);
}

function checkUserInfo(defaultState)
{
	var docUri = parseUri(window.location.href);
	
	if ( !window.serverBase )
		window.serverBase = "http://" + getAPIHost() + "/";	
		
	window.documentBase = "http://" + docUri.host + docUri.directory;
    
    nsGmx.AuthManager.checkUserInfo(function()
    {
        var tinyRef = readCookie("TinyReference");
		
		if (tinyRef)
		{
			eraseCookie("TinyReference");
			_mapHelper.restoreTinyReference(tinyRef, function(obj)
			{
				loadMap((obj.mapName == globalMapName) ? obj : defaultState);
			}, function()
			{
				loadMap(defaultState); //если пермалинк какой-то не такой, просто открываем дефолтное состояние
			});
			
			var tempPermalink = readCookie("TempPermalink");
			
			if (tempPermalink && tempPermalink == tinyRef)
			{
				sendCrossDomainJSONRequest(serverBase + "TinyReference/Delete.ashx?id=" + tempPermalink, function(response){});
				
				//eraseCookie("TinyReference");
				eraseCookie("TempPermalink");
			}
		}
		else
			loadMap(defaultState);
    }, function()
    {
        //TODO: обработка ошибок
    })
}

//Добавляем единый календарик для мультивременных слоёв. Только для карт, где есть хотя бы один такой слой
function addCommonCalendar()
{
    var isAnyTemporalLayer = false;
    for (var i = 0; i < globalFlashMap.layers.length; i++)
        if (typeof globalFlashMap.layers[i].properties.Temporal !== 'undefined' && globalFlashMap.layers[i].properties.Temporal)
        {
            isAnyTemporalLayer = true;
            break;
        }
        
    if (isAnyTemporalLayer)
    {
        var calendar = new nsGmx.Calendar();
        calendar.init('TemporalLayersCommon', {
            minimized: true,
            dateMin: new Date(2000, 01, 01),
            dateMax: new Date(),
            resourceHost: 'http://maps.kosmosnimki.ru/api/',
            showTime: false
        });
        
        calendar.setTimeBegin(0, 0, 0);
        calendar.setTimeEnd(23, 59, 59);
        
        var calendarDiv = $("<div/>").append(calendar.canvas);
        var table = $(_queryMapLayers.workCanvas).children("table");
        $(table).after(calendarDiv);
        
        var updateTemporalLayers = function()
        {
            var dateBegin = calendar.getDateBegin();
            var dateEnd = calendar.getDateEnd();
            
            for (var i = 0; i < globalFlashMap.layers.length; i++)
                if (typeof globalFlashMap.layers[i].properties.Temporal !== 'undefined' && globalFlashMap.layers[i].properties.Temporal)
                    globalFlashMap.layers[i].setDateInterval(dateBegin, dateEnd);
                    
            //console.log(dateBegin + '-' + dateEnd);
        }
        
        $(calendar).change(updateTemporalLayers);
        updateTemporalLayers();
        
        _mapHelper.customParamsManager.addProvider({
            name: 'commonCalendar',
            loadState: function(state) { calendar.loadState(state); updateTemporalLayers(); },
            saveState: function() { return calendar.saveState(); }
        });
        
        nsGmx.widgets.commonCalendar = calendar;
    }
}

function addMapName(container, name)
{
    var parent;
    if (!$$('iconMapName'))
    {
        var div = _div([_t(name)], [['attr','id','iconMapName'], ['dir','className','iconMapName']])
            td = _td([div],[['css','paddingTop','2px']]);
        
        _(container, [_table([_tbody([_tr(
            [_td([_t(_gtxt("Карта"))], [['css','color','#153069'],['css','fontSize','12px'],['css','paddingTop','2px'],['css','fontFamily','tahoma'], ['css','height','30px']]),
                      _td([_div(null,[['dir','className','markerRight']])],[['attr','vAlign','top'],['css','paddingTop',($.browser.msie ? '8px' : '10px')]]),
                       td]
                       )])])]);
    }
    else
    {
        removeChilds($$('iconMapName'));
        
        $($$('iconMapName'), [_t(name)])
    }
}

function loadMap(state)
{
	layersShown = (state.isFullScreen == "false");
	
	if (state.language)
	{
		window.language = state.language;
		
		eraseCookie("language");
		createCookie("language", window.language);
	}
	
	window.onresize = resizeAll;
	resizeAll();
    
    // При залогиневании пользователя просто перезагружаем страницу
    // Если reloadAfterLoginFlag=true, не сохраняем текущее состояние карты, 
    // иначе сохраняем всё в пермалинке и восстанавливаем после перезагрузки
    var defaultLoginCallback = function(reloadAfterLoginFlag)
    {
        return function()
        {
            if (reloadAfterLoginFlag)
                window.location.reload();
            else
                reloadMap();
        }
    }
	
	var mapCallback = function(map)
	{
		globalFlashMap = map;
		
		gmxCore.loadModules(['PluginsManager'], function()
		{
			var pluginsManager = new (gmxCore.getModule('PluginsManager').PluginsManager)();
            nsGmx.pluginsManager = pluginsManager;
			pluginsManager.addCallback( function()
			{
				pluginsManager.beforeViewer();
				
				var data = getLayers();
				
				
				if (!data)
				{
					_tab_hash.defaultHash = 'usage';
					
					_menuUp.createMenu = function()
					{
						createDefaultMenu();
						pluginsManager.addMenuItems(_menuUp);
					};
					
					_menuUp.go(true);
                    
                    nsGmx.widgets.authWidget = new nsGmx.AuthWidget(_menuUp.loginContainer, nsGmx.AuthManager, defaultLoginCallback(true));
					
					if ($$('left_usage'))
						hide($$('left_usage'))
										
					_menuUp.checkView();
					
					var divStatus = _div([_span([_t(_gtxt("У вас нет прав на просмотр данной карты"))],[['css','marginLeft','10px'],['css','color','red'],['attr','savestatus',true]])], [['css','paddingTop','10px']]);
					
					_($$('headerLinks'), [divStatus])
					
					window.onresize = resizeAll;
					resizeAll();
					
					nsGmx.widgets.authWidget.showLoginDialog();
					
					return;
				}
                
				//для всех слоёв должно выполняться следующее условие: если хотя бы одна групп-предков невидима, то слой тоже невидим.
				(function fixVisibilityConstrains (o, isVisible)
				{
					o.content.properties.visible = o.content.properties.visible && isVisible;
					isVisible = o.content.properties.visible;
					if (o.type === "group")
					{
						var a = o.content.children;
						for (var k = a.length - 1; k >= 0; k--)
							fixVisibilityConstrains(a[k], isVisible);
					}
				})({type: "group", content: { children: data.children, properties: { visible: true } } }, true);
				
				window.oldTree = JSON.parse(JSON.stringify(data));
				
				window.defaultLayersVisibility = {};
				if (map.layers)
					for (var k = 0; k < map.layers.length; k++)
						window.defaultLayersVisibility[map.layers[k].properties.name] = typeof map.layers[k].isVisible != 'undefined' ? map.layers[k].isVisible : false;
				
				//data.properties.hostName = getAPIHost();
				data.properties.hostName = window.serverBase.slice(7).slice(0, -1); //основная карта всегда загружена с того-же сайта, что и серверные скрипты
				
				_mapHelper.mapProperties = data.properties;
				_mapHelper.mapTree = data;
				
				if (window.copyright)
					map.setCopyright(window.copyright);
				
				if (state.position)
				{
					map.moveTo(state.position.x, state.position.y, state.position.z);
				}
				
				if (!data.properties.UseKosmosnimkiAPI)
				{
					for (var i = 0; i < map.layers.length; i++)
					{
						var layer = map.layers[i];
						if (layer && layer.properties.type == "Raster")
						{
							map.miniMap.addLayer(layer, false);
							layer.miniLayer = map.miniMap.layers[map.miniMap.layers.length - 1];
						}
					}
				}
				
				for (var i = map.layers.length - 1; i >= 0; i--)
					if (map.layers[i])
						map.layers[i].bounds = getLayerBounds(map.layers[i].geometry.coordinates[0], map.layers[i]);
				
				var condition = false,
					mapStyles = false;
				
				if (state.condition)
					condition = state.condition;
				
				if (state.mapStyles)
					mapStyles = state.mapStyles;
				
				_queryMapLayers.addLayers(data, condition, mapStyles);
				
				_tab_hash.defaultHash = 'layers';
                
                // расширенная версия пермалинка для авторизации
				var userObjects = data.properties.UserData;
				
				if (typeof state.userObjects != 'undefined')
					userObjects = state.userObjects;
				
				_menuUp.createMenu = function()
				{
					createMenu();
				};
				//_menuUp.createMenu = createMenu;
				_menuUp.go();
                
                if (userObjects)
				{
					_userObjects.setData(JSON.parse(userObjects));
					_userObjects.load();
				}
                
                //динамически добавляем пункты в меню
                pluginsManager.addMenuItems(_menuUp);
				
				// конвертируем старый формат eval-строки в новый формат customParamsManager
				// старый формат использовался только маплетом пожаров
				if (typeof state.customParams != 'undefined' && state.customParams)
				{
					var newFiresFormat = mapCalendar.convertEvalState(state.customParams);
					if (newFiresFormat)
						state.customParamsCollection = { firesWidget : newFiresFormat };
					else
					{
						//старый формат данных пожаров...
						try
						{
							eval(state.customParams);
						}
						catch (e) 
						{
							alert(e);
						}
					}
				}
					
				if ( typeof state.customParamsCollection != 'undefined')
					_mapHelper.customParamsManager.loadParams(state.customParamsCollection);
				
					
				/*if (state.customParams)
				{
					try
					{
						eval(state.customParams);
					}
					catch (e) 
					{
						alert(e);
					}
				}*/
				_mapHelper.gridView = false;
				
				//создаём иконку переключения в полноэкранный режим.
                var mapNameContainer = _div();
                var leftIconPanelContainer = _div();
                addMapName(mapNameContainer, data.properties.title);
                
				_leftIconPanel.create(leftIconPanelContainer);
                _($$('leftIconPanel'), [_table([_tbody([_tr([
                    _td([mapNameContainer], [['css', 'paddingLeft', '10px'], ['css', 'width', '100%']]), 
                    _td([leftIconPanelContainer])
                ])])])]);
                
                //_leftIconPanel.addMapName(data.properties.title);
				
				//добавим в тулбар две иконки, но видимой будет только одна
				//по клику переключаем между ними
				var _toggleFullscreenIcon = function(isFullScreen)
				{
					_leftIconPanel.setVisible('fullscreenon', !isFullScreen);
					_leftIconPanel.setVisible('fullscreenoff', isFullScreen);
					layersShown = !layersShown;
					resizeAll();
				}
				
				_leftIconPanel.add('fullscreenon', _gtxt("Развернуть карту"), "img/toolbar/fullscreenon.png", "img/toolbar/fullscreenon_a.png", 
								   function() { _toggleFullscreenIcon(true); });
				
				_leftIconPanel.add('fullscreenoff', _gtxt("Свернуть карту"), "img/toolbar/fullscreenoff.png", "img/toolbar/fullscreenoff_a.png", 
									function() { _toggleFullscreenIcon(false); }, null, true);
									
				
				//создаём тулбар
				
                var iconContainer = _div(null, [['css', 'borderLeft', '1px solid #216b9c']]);
                var searchContainer = _div(null,[['dir','className','searchCanvas'],['attr','id','searchCanvas']]);
                _($$('iconPanel'), [_table([_tbody([_tr([
                    _td([iconContainer]), 
                    _td([searchContainer], [['css', 'padding', '0 10px 1px 50px'], ['css', 'width', '100%']])
                ])])])]);
                
                _iconPanel.create(iconContainer);
                
                var visFuncSaveMap      = function(){ return nsGmx.AuthManager.canDoAction(nsGmx.ACTION_SAVE_MAP) && _queryMapLayers.currentMapRights() === "edit"; };
                var visFuncCreateLayers = function(){ return nsGmx.AuthManager.canDoAction(nsGmx.ACTION_CREATE_LAYERS) && _queryMapLayers.currentMapRights() === "edit"; };
                
				_iconPanel.add('saveMap', _gtxt("Сохранить карту"), "img/toolbar/save_map.png", "img/toolbar/save_map_a.png", function(){_queryMapLayers.saveMap()}, visFuncSaveMap)
				_iconPanel.add('createVectorLayer', _gtxt("Создать векторный слой"), "img/toolbar/new_shapefile.png", "img/toolbar/new_shapefile_a.png", function(){_mapHelper.createNewLayer("Vector")}, visFuncCreateLayers)
				_iconPanel.add('createRasterLayer', _gtxt("Создать растровый слой"), "img/toolbar/new_rastr.png", "img/toolbar/new_rastr_a.png", function(){_mapHelper.createNewLayer("Raster")}, visFuncCreateLayers)
				
				_iconPanel.addDelimeter('userDelimeter', false, true);
				
				_iconPanel.add('uploadFile', _gtxt("Загрузить файл"), "img/toolbar/upload.png", "img/toolbar/upload_a.png", function(){drawingObjects.loadShp.load()})
				_iconPanel.add('permalink', _gtxt("Ссылка на карту"), "img/toolbar/save.png", "img/toolbar/save_a.png", function(){_mapHelper.showPermalink();})
				_iconPanel.add('bookmark', _gtxt("Добавить закладку"), "img/toolbar/bookmark.png", "img/toolbar/bookmark_a.png", function(){mapHelp.tabs.load('mapTabs');_queryTabs.add();})
				_iconPanel.add('code', _gtxt("Код для вставки"), "img/toolbar/code.png", "img/toolbar/code_a.png", function(){_mapHelper.createAPIMapDialog();})
				_iconPanel.add('print', _gtxt("Печать"), "img/toolbar/print.png", "img/toolbar/print_a.png", function(){_mapHelper.print()})
				
                //_iconPanel.addDelimeter('feedbackDelimeter');
                //_iconPanel.add('feedback', "Сообщить об ошибке", "img/toolbar/upload.png", false, function(){_mapHelper.userFeedback()})
								
				if ( typeof window.gmxViewerUI == 'undefined' ||  !window.gmxViewerUI.hideLanguages ) 
					_translationsHash.showLanguages();		
				
				var isHeaderLinks = false;
				if (typeof window.headerLinks != 'undefined') isHeaderLinks = window.headerLinks; //совместимость с предыдущими версиями
				if ( typeof window.gmxViewerUI != 'undefined' && typeof window.gmxViewerUI.headerLinks != 'undefined' ) isHeaderLinks = window.gmxViewerUI.headerLinks;
				
				if (isHeaderLinks) 
					addHeaderLinks();
				
				if (state.mode)
				{
					if (state.mode == "map" || state.mode == "satellite" || state.mode == "hybrid")
						map.setBaseLayer({ map: "Карта", satellite: "Снимки", hybrid: "Гибрид" }[state.mode]);
					else
						map.setBaseLayer(state.mode);
				}
				
				if (state.drawnObjects)
				{
					for (var i = 0; i < state.drawnObjects.length; i++)
					{
						var color = state.drawnObjects[i].color || 0x0000FF,
							thickness = state.drawnObjects[i].thickness || 3,
							opacity = state.drawnObjects[i].opacity || 80,
							elem = map.drawing.addObject(state.drawnObjects[i].geometry, state.drawnObjects[i].properties),
							style = {outline: {color: color, thickness: thickness, opacity: opacity }, marker: { size: 3 }, fill: { color: 0xffffff }};
						
						elem.setStyle(style, {outline: {color: color, thickness: thickness + 1, opacity: Math.min(100, opacity + 20)}, marker: { size: 4 }, fill: { color: 0xffffff }});
						
						if (elem.geometry.type != "POINT")
						{
							var icon = _mapHelper.createDrawingStylesEditorIcon(style, elem.geometry.type.toLowerCase());
							_mapHelper.createDrawingStylesEditor(elem, style, icon);
							
							$(elem.canvas).find("div.colorIcon").replaceWith(icon);
						}
						
						if ( 'isBalloonVisible' in state.drawnObjects[i] ) 
							elem.balloon.setVisible( state.drawnObjects[i].isBalloonVisible );
					}
				}
				else if (state.marker)
					map.drawing.addObject({ type: "POINT", coordinates: [state.marker.mx, state.marker.my] }, { text: state.marker.mt });
				
				_menuUp.checkView();
				removeUserActions();
                
                nsGmx.widgets.authWidget = new nsGmx.AuthWidget(_menuUp.loginContainer, nsGmx.AuthManager, defaultLoginCallback());
				
				if (nsGmx.AuthManager.isLogin())
				{					
					addUserActions();
				}
                
				fnInitControls();
                
                addCommonCalendar();
				
				pluginsManager.afterViewer();
			
			}); //pluginsManager
		
		}); //loadModule
	}

	var success = createFlashMap($$("flash"), window.serverBase, globalMapName, mapCallback);
	
	if (!success)
		$$("noflash").style.display = "block";
}

function addHeaderLinks()
{
	_($$('headerLinks'), [_a([_img(null, [['attr','src','img/zoom_tool2.png']]), _t("Поиск снимков")],[['attr','href','http://search.kosmosnimki.ru'],['attr','target','_blank']]),
							  _a([_img(null, [['attr','src','img/api2.png']]), _t("API (beta)")],[['attr','href','http://kosmosnimki.ru/geomixer/docs/api_start.html'],['attr','target','_blank']]),
							  _a([_img(null, [['attr','src','img/construct.png']]), _t("Проекты")],[['attr','href','http://kosmosnimki.ru/geomixer/projects.html'],['attr','target','_blank']]),
							  _a([_img(null, [['attr','src','img/blog.png']]), _t("Блог")],[['attr','href','http://blog.kosmosnimki.ru'],['attr','target','_blank']])])

}

function promptFunction(title, value)
{
	var input = _input(null, [['attr','value', value],['css','margin','20px 10px'],['dir','className','inputStyle'],['css','width','220px']]);
	
	input.onkeydown = function(e)
	{
		var evt = e || window.event;
	  	if (getkey(evt) == 13) 
	  	{	
			globalFlashMap.moveToCoordinates(input.value);
	  		
	  		return false;
	  	}
	}
	
	var div = _div([input],[['css','textAlign','center']]);
	
	showDialog(title, div, 280, 100, false, false);
	
	div.parentNode.style.overflow = 'hidden';
}

window.prompt = promptFunction;

}); //loadjs

}); //$LAB

})();