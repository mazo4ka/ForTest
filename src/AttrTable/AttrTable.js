!(function(_){

"use strict";

nsGmx.AttrTable = nsGmx.AttrTable || {};

var attrsTable = function(layerName, layerTitle)
{
	this.layerName = layerName;
	this.layerTitle = layerTitle || '';
	
	this.filterData = null;
	
	this.activeColumns = null;
	
	this.resizeFunc = function(){};
    
    this._updateVersionHandler = null;
    
    this._isLayerOnMap = this.layerName in nsGmx.gmxMap.layersByID;
    
    this.tableFields = {
        fieldsAsArray: [],
        fieldsAsHash: {},
        titleToField: {},
        init: function(fieldParams, info) {
            var _this = this;
            this.fieldsAsHash = {};
            this.titleToField = {};
            this.fieldsAsArray = [];
            if (!fieldParams) {
                this.fieldsAsArray = [info.identityField].concat(info.attributes);
                this.fieldsAsArray.forEach(function(name) {
                    _this.fieldsAsHash[name] = true;
                    _this.titleToField[name] = name;
                })
            } else {
                fieldParams.forEach(function(field) {
                    _this.fieldsAsArray.push(field.title);
                    _this.fieldsAsHash[field.title] = true;
                    _this.titleToField[field.title] = field.name;
                })
            }
        }
    }
}

attrsTable.prototype.getLayerInfo = function()
{
    return this._layerInfo;
}

attrsTable.prototype.getInfo = function(origCanvas, outerSizeProvider, params)
{
	if (!origCanvas && $('#attrsTableDialog' + this.layerName).length)
		return;
        
    origCanvas && $(origCanvas).empty();
	
	var canvas = origCanvas || _div(null,[['attr','id','attrsTableDialog' + this.layerName], ['css', 'overflow', 'hidden']]),
		loading = _div([_img(null, [['attr','src','img/progress.gif'],['css','marginRight','10px']]), _t(_gtxt('загрузка...'))], [['css','margin','3px 0px 3px 20px']]),
		_this = this;
	
	_(canvas, [loading])

    if (!origCanvas)
    {
        outerSizeProvider = function() {
            return {
                width: canvas.parentNode.parentNode.offsetWidth,
                height: canvas.parentNode.offsetHeight
            }
        }
        
        showDialog(_gtxt("Таблица атрибутов слоя [value0]", this.layerTitle), canvas, 
            {
                width: 800, 
                height: 500, 
                resizeFunc: function()
                {
                    this.resizeFunc.apply(this,arguments);
                }.bind(this),
                closeFunc: function()
                {
                    if ( _this._updateVersionHandler !== null && _this._isLayerOnMap ) {
                        nsGmx.gmxMap.layersByID[_this.layerName].off('versionchange', _this._updateVersionHandler);
                    }
                },
                setMinSize: false
            }
        )
    }
	
	sendCrossDomainJSONRequest(serverBase + "Layer/GetLayerJson.ashx?WrapStyle=func&LayerName=" + this.layerName, function(response)
	{
		if (!parseResponse(response))
			return;
		
		loading.removeNode(true);
		
        _this._layerInfo = response.Result.properties;
        
        _this._layerColumns = [
            {Value: 'GeomIsEmpty([geomixergeojson])', Alias: '__GeomIsEmpty__'},
            {Value: '[' + response.Result.properties.identityField + ']'}
        ];
        
        var attrs = response.Result.properties.attributes;
        for (var k = 0; k < attrs.length; k++) {
            _this._layerColumns.push({Value: '[' + attrs[k] + ']'});
        }
        
		_this.drawDialog(response.Result.properties, canvas, outerSizeProvider, params);
	})
}

attrsTable.prototype._updateSearchString = function(query) {
    this._serverDataProvider.setRequests(
        serverBase + 'VectorLayer/Search.ashx', {layer: this.layerName, query: query, count: true},
        serverBase + 'VectorLayer/Search.ashx', {layer: this.layerName, query: query, columns: JSON.stringify(this._layerColumns)}
    );
}

attrsTable.prototype.drawDialog = function(info, canvas, outerSizeProvider, params)
{
    var _params = $.extend({
        hideDownload: false,
        hideActions: false,
        hideRowActions: false,
        hideSearchParams: false,
        onClick: null,
        searchParamsManager: new nsGmx.AttrTable.DefaultSearchParamsManager()
        /*attributes: [] */
    }, params);
        
	var paramsWidth = 300,
		tdParams = _td(null,[['css','width',paramsWidth + 'px'],['attr','vAlign','top']]),
		tdTable = _td(null, [['attr','vAlign','top']]),
		paramsButton = makeLinkButton(_gtxt("Показать параметры поиска")),
		addObjectButton = makeLinkButton(_gtxt("Добавить объект")),
		oldCanvasWidth = false,
		_this = this;
        
    var downloadSection = $(Handlebars.compile('<div>' +
        '<span class="buttonLink attrsDownloadLink" data-format="Shape">{{i "Скачать shp"}}</span>' +
        '{{#if isPolygon}}<span class="buttonLink attrsDownloadLink" data-format="gpx">{{i "Скачать gpx"}}</span>{{/if}}' +
        '<span class="buttonLink attrsDownloadLink" data-format="csv">{{i "Скачать csv"}}</span>' +
        '{{#if isPolygon}}<span class="buttonLink attrs-table-square-link">{{i "Рассчитать площадь"}}</span>{{/if}}' +
    '</div>')({
        isPolygon: info.GeometryType === 'polygon' 
    }));
    
    
    downloadSection.find('.attrsDownloadLink').click(function() {
        downloadLayer($(this).data('format'));
    });
    
    this.tableFields.init(_params.attributes, info);
    
    this._serverDataProvider = new nsGmx.AttrTable.ServerDataProvider({titleToParams: $.extend(this.tableFields.titleToField, {'': '__GeomIsEmpty__'})});
    
    var squareLink = downloadSection.find('.attrs-table-square-link');

    new nsGmx.AttrTable.SquareCalc(squareLink, this.layerName, this._serverDataProvider, _params.searchParamsManager);
    
    var hostName = serverBase.match(/^https?:\/\/(.*)\/$/)[1];
    
    if (!_params.hideSearchParams) {
        var searchParamsManager = _params.searchParamsManager;
        searchParamsManager.render(tdParams, this);
        $(searchParamsManager).on({
            queryChange: function() {
                _this.offset = 0;
                _this._updateSearchString(searchParamsManager.getQuery());
            },
            columnsChange: function() {
                var columns = searchParamsManager.getActiveColumns ? searchParamsManager.getActiveColumns() : _this.tableFields.fieldsAsHash;
                for (var k in columns) {
                    _this.table2.activateField(k, columns[k]);
                }
            }
        })
    }
    
    this._updateSearchString('');
    
    var downloadLayer = function(format) {
        var activeColumns = searchParamsManager.getActiveColumns ? searchParamsManager.getActiveColumns() : _this.tableFields.fieldsAsHash,
            columnsForServer = [];

        for (var c in activeColumns) {
            if (activeColumns[c]) {
                columnsForServer.push({
                    Value: '[' + _this.tableFields.titleToField[c] + ']',
                    Alias: c
                })
            }
        }

        _mapHelper.downloadVectorLayer({
            name: _this.layerName, 
            host: hostName,
            format: format,
            query: _params.searchParamsManager.getQuery(),
            columns: columnsForServer
        });
    }
    
	paramsButton.onclick = function()
	{
		oldCanvasWidth = outerSizeProvider().width;
		
		if (tdParams.style.display == 'none')
		{
			this.innerHTML = _gtxt("Скрыть параметры поиска");
			tdParams.style.display = '';
		}
		else
		{
			this.innerHTML = _gtxt("Показать параметры поиска");
			tdParams.style.display = 'none';
		}
		
		resizeFunc();
	}
    
   _params.hideSearchParams && $(paramsButton).hide();
	
	addObjectButton.onclick = function()
	{
        new nsGmx.EditObjectControl(_this.layerName);
	}
	
	addObjectButton.style.marginLeft = '20px';
    
    if (_params.hideActions)
        $(addObjectButton).hide();
	
	tdParams.style.display = 'none';
	
	var name = 'attrsTable' + info.name;
    
    var attrNames = this.tableFields.fieldsAsArray;
    var fielsWidth = new Array(_params.hideRowActions ? attrNames.length: attrNames.length + 1).join('0').split('0');
    var attrNamesHash = this.tableFields.fieldsAsHash;
    
    _params.hideDownload && downloadSection.hide();

    this.divTable2 = _div(null, [['css','overflow','auto'], ['dir', 'className', 'attrsTableBody']]);
    var tdTable2 = _td([this.divTable2, downloadSection[0]], [['attr','vAlign','top']]);
    this.table2 = new nsGmx.ScrollTable({pagesCount: 10, limit: 20});
    var drawTableItem2 = function(elem, curIndex, activeHeaders)
    {
        var tds = [];

        var showButton = makeImageButton('img/choose.png','img/choose_a.png'),
            editButton = makeImageButton('img/edit.png'),
            deleteButton = makeImageButton("img/recycle.png", "img/recycle_a.png"),
            tdControl;
            
        if (info.Access !== 'edit' && info.Access !== 'editrows') {
            tdControl = _td([_div([showButton],[['css','width','45px']])], [['css','width','45px']]);
        } else {
            tdControl = _td([_div([showButton, editButton, deleteButton],[['css','width','45px']])], [['css','width','45px']]);
        }
        
        editButton.style.marginLeft = '5px';
        editButton.style.width = '12px';
        deleteButton.style.marginLeft = '5px';

        editButton.onclick = function()
        {
            var id = elem.values[elem.fields[info.identityField].index];
            new nsGmx.EditObjectControl(_this.layerName, id);
        }
        
        deleteButton.onclick = function()
        {
            var remove = makeButton(_gtxt("Удалить"));
            remove.onclick = function()
            {
                var id = elem.values[elem.fields[info.identityField].index];
                _mapHelper.modifyObjectLayer(_this.layerName, [{action: 'delete', id: id}]).done(function()
                {
                    removeDialog(jDialog);
                })
            };
            
            var offset = $(deleteButton).offset();
            
            var jDialog = showDialog(_gtxt("Удалить объект?"), _div([remove],[['css','textAlign','center']]), 180, 75, offset.left + 20, offset.top - 30);
        }
        
        showButton.onclick = function()
        {
            var id = elem.values[elem.fields[info.identityField].index];
            sendCrossDomainJSONRequest(serverBase + "VectorLayer/Search.ashx?WrapStyle=func&layer=" + _this.layerName + "&page=0&pagesize=1&geometry=true&query=" + encodeURIComponent("[" + info.identityField + "]=" + id), function(response) {
                if (!parseResponse(response))
                    return;
                    
                var columnNames = response.Result.fields;
                var row = response.Result.values[0];
                for (var i = 0; i < row.length; ++i)
                {
                    if (columnNames[i] === 'geomixergeojson' && row[i])
                    {
                        var layer = nsGmx.gmxMap.layersByID[_this.layerName];
                        
                        var fitBoundsOptions = layer ? {maxZoom: layer.options.maxZoom} : {};
                        
                        var geom = L.gmxUtil.geometryToGeoJSON(row[i], true);
                        var bounds = L.gmxUtil.getGeometryBounds(geom);
                        nsGmx.leafletMap.fitBounds([
                            [bounds.min.y, bounds.min.x],
                            [bounds.max.y, bounds.max.x]
                        ], fitBoundsOptions);
                    }
                }
            })
        }
        
        _title(deleteButton, _gtxt("Удалить"));
        _title(editButton, _gtxt("Редактировать"));
        _title(showButton, _gtxt("Показать"));
        
        $(showButton).toggle(!elem.values[elem.fields['__GeomIsEmpty__'].index]);
        
        if (!_params.hideRowActions)
            tds.push(tdControl);
        
        for (var j = 0; j < activeHeaders.length; ++j)
        {
            if (activeHeaders[j] == "")
                continue;
                
            var fieldName = _this.tableFields.titleToField[activeHeaders[j]];
                
            if (fieldName in elem.fields)
            {
                var valIndex = elem.fields[fieldName].index,
                    td = _td();
                
                _(td, [_t(nsGmx.Utils.convertFromServer(elem.fields[fieldName].type, elem.values[valIndex]))])
                
                if (elem.fields[fieldName].type == 'integer')
                    td.style.textAlign = 'right';
                
                tds.push(td);
            }
            else
            {
                tds.push(_td());
            }
        }
        
        var tr = _tr(tds);
        
        if (curIndex % 2 != 0)
            tr.className = 'odd';
        
        if (_params.onClick) {
            tr.onclick = function()
            {
                _params.onClick(elem);
            }
            tr.style.cursor = 'pointer';
        }
        
        return tr;
    }
    
    var tableFields = _params.hideRowActions ? attrNames : [""].concat(attrNames);
    
    this.table2.setDataProvider(this._serverDataProvider);
    this.table2.createTable(this.divTable2, 'attrs', 0, tableFields, fielsWidth, drawTableItem2, $.extend(attrNamesHash, {'': true}), true);
	
	_(canvas, [_div([paramsButton, addObjectButton],[['css','margin','10px 0px 10px 1px']])])
	_(canvas, [_table([_tbody([_tr([tdParams, tdTable2])])],['css','width','100%'])])
	
	var resizeFunc = function()
	{
		var dialogWidth = oldCanvasWidth || outerSizeProvider().width;
		
		oldCanvasWidth = false;
		
		canvas.childNodes[1].style.width = dialogWidth - 21 - 10 + 'px';
		tdTable2.style.width = dialogWidth - tdParams.offsetWidth - 21 - 10 + 'px';
		_this.divTable2.style.width = dialogWidth - tdParams.offsetWidth - 21 - 10 + 'px';
		
        var dialogHeight = outerSizeProvider().height;
		_this.divTable2.style.height = dialogHeight - canvas.firstChild.offsetHeight - 25 - 10 - 30 + 'px';
		
        _this.table2.updateHeight(parseInt(_this.divTable2.style.height));
        _params.searchParamsManager.resize && _params.searchParamsManager.resize({
            width: tdParams.offsetWidth,
            height: _this.divTable2.offsetHeight
        });
	}
	
	this.resizeFunc = resizeFunc;
	
	resizeFunc();
    
    if (this._isLayerOnMap)
    {
        this._updateVersionHandler = function() {
            _this._serverDataProvider.serverChanged();
        }
        
        nsGmx.gmxMap.layersByID[this.layerName].on('versionchange', this._updateVersionHandler);
    }
}

var attrsTableHash = function()
{
	this.hash = {};
    this.hooks = [];
    this._hookID = 0;
}

attrsTableHash.prototype.create = function(name, canvas, outerSizeProvider, params)
{
    params = params || {};
    this.hooks.forEach(function(hookInfo) {
        params = hookInfo.hook(params, name) || params;
    })
    
	if (name in this.hash)
	{
        this.hash[name].getInfo(canvas, outerSizeProvider, params);
	}
	else
	{
        var title = nsGmx.gmxMap.layersByID[name] ? nsGmx.gmxMap.layersByID[name].getGmxProperties().title : '';
        var newAttrsTable = new attrsTable(name, title);
		newAttrsTable.getInfo(canvas, outerSizeProvider, params);
		
		this.hash[name] = newAttrsTable;
	}
    
    return this.hash[name];
}

attrsTableHash.prototype.addHook = function(paramsHook) {
    var id = 'id' + this._hookID++;
    this.hooks.push({id: id, hook: paramsHook});
    return id;
}

attrsTableHash.prototype.removeHook = function(hookID) {
    for (var i = 0; i < this.hooks.length; i++) {
        if (this.hooks[i].id === hookID) {
            this.hooks.splice(i, 1);
            return;
        }
    }
}

window.nsGmx = window.nsGmx || {};

window._attrsTableHash = new attrsTableHash();

/** Менеджер поискового интерфейса таблицы атрибутов. 
    Используется в таблице атрибутов для задания кастомизированного интерфейса поиска объектов слоя.
    Генерирует события queryChange и columnsChange
  @typedef IAttrTableSearchManager
  @memberOf nsGmx
  @prop {function(container, attrTable)} render Ф-ция для отрисовки кастомизированного интерфейса в контейнере. Параметры: container, attrTable
  @prop {function(): String} getQuery Получить SQL запрос за данными
  @prop {function(): Object} getActiveColumns Получить хеш с описанием активности колонок (имя колонки -> true/false)
  @prop {function(dims)} resize Ф-ция для реакции на изменения размера диалога. dims - целевые размеры контейнера (width, height)
*/

/** Показать таблицу атрибутов векторного слоя
  @func createAttributesTable
  @memberOf nsGmx
  @param {String} layerName ID слоя
  @param {DOMElement} canvas Контейнер, куда поместить таблицу атрибутов. Если не указано, будет создан новый диалог
  @param {function} outerSizeProvider Ф-ция для определения текущих размеров контейнера. Должна возвращать объект с полями width и height. Применяется только если указан canvas.
  @param {Object} params Дополнительные параметры
  @param {Boolean} [params.hideDownload=false] Скрыть секцию с вариантами скачивания данных
  @param {Boolean} [params.hideActions=false] Скрыть секцию с добавлением объекта
  @param {Boolean} [params.hideRowActions=false] Скрыть столбец таблицы с действиями над отдельными объектами 
  @param {Boolean} [params.hideSearchParams=false] Скрыть секцию с параметрами поиска
  @param {function} [params.onClick] Ф-ция, которая будет вызываться при клике на строчке таблицы. Первым параметром передаётся объект, по которому кликнули
  @param {Array} [params.attributes] Массив, определяющий, какие атрибуты показывать. Каждый элемент - объект с полями "name" (исходное название атрибута) и title (как отображать в таблице). 
                 Если атрибута нет в массиве, он не будет показан в таблице. Если массив не указан, показываются все атрибуты
  @param {nsGmx.IAttrTableSearchManager} [params.searchParamsManager] Менеджер UI для поиска в таблице атрибутов
  @return Интерфейс для управления таблицей атрибутов
*/

window.nsGmx.createAttributesTable = window._attrsTableHash.create.bind(window._attrsTableHash);


/** Добавить хук для изменения параметров при вызове таблицы атрибутов
  @func addAttributesTableHook
  @memberOf nsGmx
  @param {function(params, layerName):Object} paramsHook Хук, который вызывается при каждом вызове диалога редактирования. 
         Первый параметр - параметры диалога (можно модифицировать), второй - ID слоя).
  @return {String} ID добавленного хука
*/
window.nsGmx.addAttributesTableHook = function(paramsHook) {
    return window._attrsTableHash.addHook(paramsHook);
};

/** Удаляет хук параметров
  @func removeAttributesTableHook
  @memberOf nsGmx
  @param {String} hookID ID хука для удаления
*/
window.nsGmx.removeAttributesTableHook = function(hookID) {
    window._attrsTableHash.removeHook(hookID);
};

})(nsGmx.Utils._);