(function(){

//для отслеживания того, что не открыли диалог редактирования одного и того же объекта несколько раз
var EditObjectControlsManager = {
    _editControls: [],
    _paramsHooks: [],
    
    find: function(layerName, oid)
    {
        for (var iD = 0; iD < this._editControls.length; iD++)
            if ( layerName == this._editControls[iD].layer && oid == this._editControls[iD].oid )
                return this._editControls[iD].control;
    },
    
    add: function(layerName, oid, control)
    {
        for (var iD = 0; iD < this._editControls.length; iD++)
            if ( layerName == this._editControls[iD].layer && oid == this._editControls[iD].oid )
            {
                this._editControls[iD].control = control;
                return;
            }
        this._editControls.push({ layer: layerName, oid: oid, control: control });
    },
    
    remove: function(layerName, oid)
    {
        for (var iD = 0; iD < this._editControls.length; iD++)
            if ( layerName == this._editControls[iD].layer && oid == this._editControls[iD].oid )
            {
                this._editControls.splice(iD, 1);
                return;
            }
    },
    
    addParamsHook: function(paramsHook) {
        this._paramsHooks.push(paramsHook);
    },
    
    applyParamsHook: function(params) {
        for (var h = 0; h < this._paramsHooks.length; h++) {
            params = this._paramsHooks[h](params);
        }
        
        return params;
    }
}

var getInputElement = function(type)
{
    var input = _input(null, [['dir','className','inputStyle edit-obj-input']]);
    
    if (type == 'date')
    {
        $(input).datepicker({
            changeMonth: true,
            changeYear: true,
            dateFormat: "dd.mm.yy"
        });
    }
    else if ( type == 'datetime' )
    {
        $(input).datetimepicker(
        {
            changeMonth: true,
            changeYear: true,
            dateFormat: "dd.mm.yy",
            timeFormat: "hh:mm:ss",
            showSecond: true,
            timeOnly: false
        })
    }
    else if ( type == "time" )
    {
        $(input).timepicker({
            timeOnly: true,
            timeFormat: "hh:mm:ss",
            showSecond: true
        });
    }
    
    return input;
}

//Коллекция полей с информацией для создания диалога редактирования
var FieldsCollection = function() {
    var _asArray = [];
    var _asHash = {};
    
    this.append = function(field) {
        field.origIndex = _asArray.length;
        _asArray.push(field);
        _asHash[field.name] = field;
    }
    
    this.update = function(field) {
        if (field.name in _asHash) {
            var origIndex = _asHash[field.name].origIndex;
            $.extend(true, _asHash[field.name], field);
            _asHash[field.name].origIndex = origIndex;
        }
    }
    
    this.get = function(name) {
        return _asHash[name];
    }
    
    this.each = function(callback) {
        _asArray.forEach(callback);
    }
    
    //Сначала isRequired, потом identityField, потом в порядке добавления
    this.sort = function() {
        _asArray = _asArray.sort(function(a, b) {
            if (!!a.isRequired ^ !!b.isRequired) {
                return Number(!!b.isRequired) - Number(!!a.isRequired);
            }
            
            if (!!a.identityField || !!b.identityField) {
                return Number(!!b.identityField) - Number(!!a.identityField);
            }
            
            var userZIndexDelta = (b.index || 0) - (a.index || 0);
            return  userZIndexDelta || (b.origIndex - a.origIndex);
        })
    }
}

/** Объект, описывающий один атрибут слоя
 * @typedef {Object} nsGmx.EditObjectControl.FieldInfo
 * @property {String} name имя атрибута (обязательно)
 * @property {String|int} [value] значение атрибута в формате сервера
 * @property {bool} [constant=false] можно ли редактировать атрибут
 * @property {bool} [hide=false] совсем не показыавать этот атрибут
 * @property {String} [title=<совпадает с name>] что показывать вместо имени атрибута
 * @property {function(val):bool} [validate] ф-ция для валидации результата. На вход получает введённое пользователем значение 
*      (до преобразования в серверный формат), должна вернуть валидно ли это значение.
 * @property {String} [isRequired=false] является ли значение атрибута обязательным. Обязательные атрибуты показываются выше всех остальных и выделяются жирным шрифтом.
 * @property {Number} [index=0] индекс для сортировки. Влияет на порядок показа полей в диалоге. Больше - выше.
*/

/** Контрол, который показывает диалог редактирования существующего или добавления нового объекта в слой.
* 
* @memberOf nsGmx
* @class
* @param {String}   layerName ID слоя
* @param {Number}   objectId ID объекта (null для нового объекта)
* @param {Object}   [params] Дополнительные параметры контрола
* @param {gmxAPI.drawingObject} [params.drawingObject] Пользовательский объект для задании геометрии или null, если геометрия не задана
* @param {function} [params.onGeometrySelection] Внешняя ф-ция для выбора геометрии объекта. 
         Сигнатура: function(callback), параметр callback(gmxAPI.drawingObject|geometry) должен быть вызван когда будет выбрана геометрия.
* @param {HTMLNode} [params.geometryUI] HTML элемент, который нужно использовать вместо стандартных контролов для выбора геометрии (надпись + иконка)
* @param {nsGmx.EditObjectControl.FieldInfo[]} [params.fields] массив с описанием характеристик атрибутов для редактирования . Должен содержать только атрибуты, которые есть в слое.
* @param {bool} [params.allowDuplicates=<depends>] Разрешать ли несколько диалогов для редактирования/создания этого объекта. 
         По умолчанию для редактирования запрещено, а для создания нового разрешено.
* @param {HTMLNode} [params.afterPropertiesControl] HTML элемент, который нужно поместить после списка атрибутов
*/
var EditObjectControl = function(layerName, objectId, params)
{
    /** Объект был изменён/добавлен
     * @event nsGmx.EditObjectControl#modify
     */
     
    /** Генерируется перед изменением/добавлением объекта. Может быть использован для сохранения в свойствах объекта каких-то внешних данных.
     * @event nsGmx.EditObjectControl#premodify
     */
     
    /** Закрытие диалога редактирования
     * @event nsGmx.EditObjectControl#close
     */
     
    var isNew = objectId == null;
    var _params = $.extend({
            drawingObject: null, 
            fields: [], 
            validate: {},
            allowDuplicates: isNew,
            afterPropertiesControl: _span()
        }, params);
        
    _params = EditObjectControlsManager.applyParamsHook(_params);
        
    var _this = this;
    if (!_params.allowDuplicates && EditObjectControlsManager.find(layerName, objectId))
        return EditObjectControlsManager.find(layerName, objectId);
    
    EditObjectControlsManager.add(layerName, objectId, this);
    
    var layer = globalFlashMap.layers[layerName];
    var geometryInfoContainer = _span(null, [['css','color','#215570'],['css','marginLeft','3px'],['css','fontSize','12px']]);
    
    var originalGeometry = null;
    var drawingBorderDialog = null;
    var identityField = layer.properties.identityField;
    
    var modifyRectangularGeometry = function(geom) {
        if (geom.type === 'POLYGON') {
            // добавим маленький сдвиг, чтобы рисовать полигон, а не прямоугольник
            geom.coordinates[0][0][0] += 0.00001;
            geom.coordinates[0][0][1] += 0.00001;
                    
            // чтобы если бы последняя точка совпадала с первой, то это бы ни на что не повлияло
            var pointCount = geom.coordinates[0].length;
            geom.coordinates[0][pointCount-1][0] += 0.00001;
            geom.coordinates[0][pointCount-1][1] += 0.00001;
        }
    }
    
    var geometryInfoRow = null;
    var geometryMapObject = null;
    var bindDrawingObject = function(obj)
    {
        geometryInfoRow && geometryInfoRow.RemoveRow();
        if (geometryMapObject) {
            geometryMapObject.remove();
            geometryMapObject = null;
            $(geometryInfoContainer).empty();
        }
        
        if (!obj) return;
        
        var InfoRow = gmxCore.getModule('DrawingObjects').DrawingObjectInfoRow;
        geometryInfoRow = new InfoRow(
            globalFlashMap, 
            geometryInfoContainer, 
            obj, 
            { editStyle: false, allowDelete: false }
        );
    }
    
    //geom может быть либо классом gmxAPI.DrawingObject, либо просто описанием геометрии
    var bindGeometry = function(geom) {
        if (!geom) {
            return;
        }
        
        //gmxAPI.DrawingObject
        if (geom.getGeometry) {
            bindDrawingObject(geom);
            return;
        }
        
        if (geom.type == "POINT" || geom.type == "LINESTRING" || geom.type == "POLYGON") {
            modifyRectangularGeometry(geom);
            bindDrawingObject(globalFlashMap.drawing.addObject(geom));
        } else {            
            geometryInfoRow && geometryInfoRow.RemoveRow();
            geometryInfoRow = null;
            
            var titles = {
                'MULTIPOLYGON':    _gtxt("Мультиполигон"),
                'MULTILINESTRING': _gtxt("Мультилиния"),
                'MULTIPOINT':      _gtxt("Мультиточка")
            };
            
            $(geometryInfoContainer).empty().append($('<span/>').css('margin', '3px').text(titles[geom.type]));
            
            geometryMapObject = globalFlashMap.addObject(geom);
            geometryMapObject.setStyle({outline: {color: 0x0000ff, thickness: 2}, marker: {size: 3}});
        }
    }

    var canvas = null;
    
    var createDialog = function()
    {
        var createButton = makeLinkButton(isNew ? _gtxt("Создать") : _gtxt("Изменить")),
            removeButton = makeLinkButton(_gtxt("Удалить")),
            trs = [];
            
        var canvas = _div(null, [['dir', 'className', 'edit-obj']]);
        
        $(canvas).bind('dragover', function() {
            return false;
        });
        
        $(canvas).bind('drop', function(e) {
            var files = e.originalEvent.dataTransfer.files;
            nsGmx.Utils.parseShpFile(files[0]).done(function(objs) {
                bindGeometry(nsGmx.Utils.joinPolygons(objs));
            });
            return false;
        });
        
        removeButton.onclick = function()
        {
            _mapHelper.modifyObjectLayer(layerName, [{action: 'delete', id: objectId}]).done(function()
            {
                removeDialog(dialogDiv);
                closeFunc();
            })
        }
        
        removeButton.style.marginLeft = '10px';
	
        createButton.onclick = function()
        {
            $(_this).trigger('premodify');
            
            var properties = {};
            var anyErrors = false;
            $(".edit-attr-value", canvas).each(function(index, elem)
            {
                if (elem.rowName === identityField)
                    return;
                
                var clientValue = 'value' in elem ? elem.value : $(elem).text();
                var value = nsGmx.Utils.convertToServer(elem.rowType, clientValue);
                var validationFunc = fieldsCollection.get(elem.rowName).validate || _params.validate[elem.rowName];
                var isValid = !validationFunc || validationFunc(clientValue);
                
                if (isValid) {
                    properties[elem.rowName] = value;
                } else {
                    anyErrors = true;
                    inputError(elem);
                }
            });
            
            if (anyErrors) return;
            
            var obj = { properties: properties };
            
            var selectedGeom = null;
            
            if (geometryInfoRow && geometryInfoRow.getDrawingObject()) {
                selectedGeom = geometryInfoRow.getDrawingObject().getGeometry();
            } else if (geometryMapObject) {
                selectedGeom = geometryMapObject.getGeometry();
            }
            
            if (!selectedGeom)
            {
                showErrorMessage("Геометрия для объекта не задана", true, "Геометрия для объекта не задана");
                return;
            }
            
            if (!isNew)
            {
                obj.id = objectId;

                var curGeomString = JSON.stringify(selectedGeom);
                var origGeomString = JSON.stringify(originalGeometry);
                
                if (origGeomString !== curGeomString)
                    obj.geometry = gmxAPI.merc_geometry(selectedGeom);
            }
            else
            {
                obj.geometry = gmxAPI.merc_geometry(selectedGeom);
            }
            
            _mapHelper.modifyObjectLayer(layerName, [obj]).done(function()
            {
                $(_this).trigger('modify');
                removeDialog(dialogDiv);
                closeFunc();
            })
        }
    
        var resizeFunc = function(event, ui)
        {
            if (!isNew && $(canvas).children("[loading]").length)
                return;
            
            canvas.firstChild.style.height = canvas.parentNode.offsetHeight - 25 - 10 - 10 + 'px';
        }
        
        var closeFunc = function()
        {
            geometryInfoRow && geometryInfoRow.getDrawingObject() && geometryInfoRow.getDrawingObject().remove();
            geometryMapObject && geometryMapObject.remove();
                
            originalGeometry = null;
            
            if (drawingBorderDialog)
                removeDialog(drawingBorderDialog);
            
            EditObjectControlsManager.remove(layerName, objectId);
            
            $(_this).trigger('close');
        }
        
        var fieldsCollection = new FieldsCollection();
        
        //либо drawingObject либо geometry
        var drawAttrList = function(fields)
        {
            var trs = [],
                firstInput;
            
            //сначала идёт геометрия
            var geomTitleTmpl = '<span><span class="edit-obj-geomtitle">{{i+Геометрия}}</span><span id = "choose-geom" class="gmx-icon-choose"></span></span>';
            
            var geometryUI = _params.geometryUI || $(Mustache.render(geomTitleTmpl))[0];
            $('#choose-geom', geometryUI).click(function() {
                if (_params.onGeometrySelection) {
                    _params.onGeometrySelection(bindGeometry);
                } else {
                    nsGmx.Controls.chooseDrawingBorderDialog(
                        'editObject', 
                        bindDrawingObject,
                        { geomType: layer.properties.GeometryType }
                    );
                }
            })
            
            trs.push(_tr([_td([geometryUI],[['css','height','20px']]), _td([geometryInfoContainer])]));
            
            fields.sort();
            
            //потом все остальные поля
            fields.each(function(field) {
                var td = _td();
                if (field.constant)
                {
                    if ('value' in field)
                    {
                        var span = _span(null,[['dir', 'className', 'edit-attr-value edit-obj-constant-value']]);
                        // var span = _span(null,[['css','marginLeft','3px'],['css','fontSize','12px'], ['dir', 'className', 'edit-attr-value']]);
                        span.rowName = field.name;
                        span.rowType = field.type;
                        _(span, [_t(nsGmx.Utils.convertFromServer(field.type, field.value))]);
                    }
                    _(td, [span])
                }
                else
                {
                    var input = getInputElement(field.type);
                    input.rowName = field.name;
                    input.rowType = field.type;
                    
                    firstInput = firstInput || input;
                    
                    if ('value' in field)
                        input.value = nsGmx.Utils.convertFromServer(field.type, field.value);
                        
                    $(input).addClass('edit-attr-value');
                        
                    _(td, [input]);
                }
                
                var fieldHeader = _span([_t(field.title || field.name)],[['css','fontSize','12px']]);
                if (field.isRequired) {
                    fieldHeader.style.fontWeight = 'bold';
                }
                var tr = _tr([_td([fieldHeader]), td], [['css', 'height', '22px']]);
                
                field.hide && $(tr).hide();
                
                trs.push(tr);
            })
            
            _(canvas, [_div([_table([_tbody(trs)], [['dir', 'className', 'obj-edit-proptable']]), _params.afterPropertiesControl],[['dir', 'className', 'obj-edit-canvas'], ['css','overflow','auto']])]);
            
            _(canvas, [_div([createButton],[['css','margin','10px 0px'],['css','height','20px']])]);
            
            firstInput && firstInput.focus();
            
            resizeFunc();
        }
        
        var dialogDiv = showDialog(isNew ? _gtxt("Создать объект слоя [value0]", layer.properties.title) : _gtxt("Редактировать объект слоя [value0]", layer.properties.title), canvas, 510, 300, false, false, resizeFunc, closeFunc);
        
        if (!isNew)
        {
            var loading = _div([_img(null, [['attr','src','img/progress.gif'],['css','marginRight','10px']]), _t(_gtxt('загрузка...'))], [['css','margin','3px 0px 3px 20px'],['attr','loading',true]]);
        
            _(canvas, [loading])
            
            //получаем геометрию объекта
            sendCrossDomainJSONRequest(serverBase + "VectorLayer/Search.ashx?WrapStyle=func&layer=" + layerName + "&page=0&pagesize=1&orderby=" + identityField + "&geometry=true&query=[" + identityField + "]=" + objectId, function(response)
            {
                if (!parseResponse(response))
                    return;
                    
                $(canvas).children("[loading]").remove();
                
                var columnNames = response.Result.fields;
                var drawingObject = null;
                var geometryRow = response.Result.values[0];
                var types = response.Result.types;
                
                for (var i = 0; i < geometryRow.length; ++i)
                {
                    if (columnNames[i] === 'geomixergeojson')
                    {
                        var geom = from_merc_geometry(geometryRow[i]);
                        bindGeometry(geom);
                        if (geom) {
                            originalGeometry = $.extend(true, {}, geom);
                        }
                    }
                    else
                    {
                        var field = {
                            value: geometryRow[i],
                            type: types[i], 
                            name: columnNames[i], 
                            constant: columnNames[i] === identityField,
                            identityField: columnNames[i] === identityField,
                            isRequired: false
                        };
                        
                        fieldsCollection.append(field);
                    }
                }
                
                _params.fields.forEach(fieldsCollection.update);
                
                drawAttrList(fieldsCollection);
                
                _this.initPromise.resolve();
            })
        }
        else
        {
            for (var i = 0; i < layer.properties.attributes.length; ++i)
            {
                fieldsCollection.append({type: layer.properties.attrTypes[i], name: layer.properties.attributes[i]})
            }
            
            _params.fields.forEach(fieldsCollection.update);
            
            if (_params.drawingObject) {
                bindDrawingObject(_params.drawingObject);
            }
            
            drawAttrList(fieldsCollection);
            
            _this.initPromise.resolve();
        }
    }
    
    
    /** Promise для отслеживания момента полной инициализации диалога. Только после полной инициализации можно полноценно пользоваться методами get/set
      * @memberOf nsGmx.EditObjectControl.prototype
      * @member {jQuery.Deferred} initPromise
    */
    this.initPromise = $.Deferred();
    
    /** Получить текущее значение атрибута из контрола
      @memberOf nsGmx.EditObjectControl.prototype
      @param {String} fieldName Имя атрибута
      @method get
    */
    this.get = function(fieldName) {
        var resValue = null;
        $(".edit-attr-value", canvas).each(function(index, elem)
        {
            if (elem.rowName === fieldName) {
                resValue = 'value' in elem ? elem.value : $(elem).text();
            }
        });
        return resValue;
    }
    
    /** Задать значение атрибута объекта из контрола
      @memberOf nsGmx.EditObjectControl.prototype
      @method set
      @param {String} fieldName Имя атрибута
      @param {String|Integer} value Значение в клиентском формате, который нужно установить для этого атрибута
    */
    this.set = function(fieldName, value) {
        $(".edit-attr-value", canvas).each(function(index, elem)
        {
            if (elem.rowName === fieldName) {
                if ('value' in elem) {
                    elem.value = value;
                } else {
                    $(elem).text(value);
                }
            }
        });
    }
    
    /** Задать геометрию для редактируемого объекта
      @memberOf nsGmx.EditObjectControl.prototype
      @method setGeometry
      @param {gmxAPI.DrawingObject|geometry} geometry Геометрия в виде drawing объекта или просто описание геометрии
    */
    this.setGeometry = function(geometry) {
        bindGeometry(geometry);
    }
    
    createDialog();
}

nsGmx.EditObjectControl = EditObjectControl;

/** Добавить "хук" для модификации параметров при всех вызовах ф-ции {@link nsGmx.EditObjectControl}
    @function
    @param {function(Object): Object} {paramsHook} Ф-ция, которая принимает на вход параметры ф-ции {@link nsGmx.EditObjectControl} 
        и возвращает модифицируемые параметры (возможна замена in place)
*/
nsGmx.EditObjectControl.addParamsHook = EditObjectControlsManager.addParamsHook.bind(EditObjectControlsManager);

})();