﻿/*
    Плагин с пользовательским интерфейсом сдвига растровых слоёв и каталогов растров
*/
(function() {

    _translationsHash.addtext("rus", {
        'shiftRastersPlugin.saveBtnTitle': 'Готово',
        'shiftRastersPlugin.cancelBtnTitle': 'Отмена',
        'shiftRastersPlugin.startBtnTitle': 'Сместить'
    });
    
    _translationsHash.addtext("eng", {
        'shiftRastersPlugin.saveBtnTitle': 'Done',
        'shiftRastersPlugin.cancelBtnTitle': 'Cancel',
        'shiftRastersPlugin.startBtnTitle': 'Shift'
    });
    
    var rowUITemplate = '<span><span class = "shift-rasters-label">dx</span> \
            <input class="inputStyle shift-rasters-input" id="dx"></input> \
            <span class = "shift-rasters-label">dy</span> \
            <input class="inputStyle shift-rasters-input" id="dy"></input> \
            <button class="shift-rasters-btn" id="btnStart">{{i+shiftRastersPlugin.startBtnTitle}}</button> \
            <button class="shift-rasters-btn" id="btnSave">{{i+shiftRastersPlugin.saveBtnTitle}}</button> \
            <button class="shift-rasters-btn" id="btnCancel">{{i+shiftRastersPlugin.cancelBtnTitle}}</button>\
            </span>';
            
    var uiTemplate = 
        '<div>' + 
            '<div class = "shift-rasters-title">Сдвигайте слой на карте</div>' +
            rowUITemplate + 
        '</div>';
        
    //события: click:save, click:cancel, click:start
    var ShiftLayerView = function(canvas, shiftParams, layer, initState) {
        var _this = this;
        
        var isActiveState = initState;
        var updateState = function() {
            $('#btnCancel, #btnSave', ui).toggle(isActiveState);
            $('#btnStart', ui).toggle(!isActiveState);
            $('.shift-rasters-input' ,ui).prop('disabled', !isActiveState);
            
            if (isActiveState) {
                layer.enableDragging(drag, dragStart);
            } else {
                layer.disableDragging();
            }
        }

        var ui = $(Mustache.render(rowUITemplate)).appendTo(canvas);
        updateState();
        
        $('button', canvas).click(function() {
            var eventName = {btnCancel: 'cancel', btnSave: 'save', btnStart: 'start'}[this.id];
            $(_this).trigger('click:' + eventName);
        });
        
        var updateParamsUI = function() {
            var dx = Math.floor(shiftParams.get('dx'));
            var dy = Math.floor(shiftParams.get('dy'));
            var curDx = parseFloat($('#dx', canvas).val() || 0);
            var curDy = parseFloat($('#dy', canvas).val() || 0);
            
            if (!isNaN(curDx) && Math.floor(curDx) !== dx) {
                $('#dx', canvas).val(dx);
            }
            
            if (!isNaN(curDy) && Math.floor(curDy) !== dy) {
                $('#dy', canvas).val(dy);
            }
            
            layer.setPositionOffset(shiftParams.get('dx'), shiftParams.get('dy'));
        };
        
        shiftParams.on('change', updateParamsUI);
        updateParamsUI();
        
        $('input', canvas).bind('change keyup', function() {
            shiftParams.set({
                dx: parseFloat($('#dx', canvas).val()) || 0,
                dy: parseFloat($('#dy', canvas).val()) || 0
            });
        });
        
        var sx, sy;
        
        var drag = function( x, y, o ) {        // Вызывается при mouseMove при нажатой мышке
            shiftParams.set({
                dx: gmxAPI.merc_x(x) - sx,
                dy: gmxAPI.merc_y(y) - sy
            });
        };
        var dragStart = function( x, y, o ) {      // Вызывается при mouseDown
            sx = gmxAPI.merc_x( x ) - shiftParams.get('dx');
            sy = gmxAPI.merc_y( y ) - shiftParams.get('dy');
        };
        
        this.setState = function(isActive) {
            isActiveState = isActive;
            updateState();
        }
        
        updateState();
    }
    
    var menu, currentView;
    
    //geom в latlng, а dx и dy в меркаторе
    var shiftMercGeometry = function(geom, dx, dy) {
        var transformX = function(x) {
            return gmxAPI.from_merc_x(gmxAPI.merc_x(x) + dx);
        }
        
        var transformY = function(y) {
            return gmxAPI.from_merc_y(gmxAPI.merc_y(y) + dy);
        }
        
        return gmxAPI.transformGeometry(geom, transformX, transformY);
    }

    var publicInterface = {
        pluginName: 'Shift Rasters Plugin',
        afterViewer: function(params, map) {
        
            //объекты каталога растров
            nsGmx.EditObjectControl.addParamsHook(function(layerName, objectId, params) {
                var metaProps = map.layers[layerName].properties.MetaProperties;
                if (!metaProps.shiftXfield || !metaProps.shiftYfield) {
                    return params;
                }
                
                var shiftXfield = metaProps.shiftXfield.Value,
                    shiftYfield = metaProps.shiftYfield.Value;
                
                params = params || {};
                params.fields = params.fields || [];
                
                var hideField = function(name) {
                    var fieldDescription = nsGmx._.findWhere(params.fields, {name: name});
                    if (fieldDescription) {
                        fieldDescription.hide = true;
                    } else {
                        params.fields.push({name: name, hide: true});
                    }
                }
                
                hideField(shiftXfield);
                hideField(shiftYfield);
                
                params.fields.unshift({
                    title: "Сдвиг растра",
                    view: {
                        getUI: function(editDialog) {
                            $(editDialog).on('close', function() {
                                shiftLayer.remove();
                                editDialog.getLayer().setVisibilityFilter();
                            });

                            var canvas = $('<div/>'),
                                dx = editDialog.get(shiftXfield),
                                dy = editDialog.get(shiftYfield),
                                shiftParams = new Backbone.Model({
                                    dx: dx,
                                    dy: dy
                                }),
                                originalShiftParams,
                                shiftLayer = map.addLayer({properties: {
                                    IsRasterCatalog: true,
                                    RCMinZoomForRasters: 10
                                }}),
                                geomDx = dx,
                                geomDy = dy;

                            var shiftView = new ShiftLayerView(canvas, shiftParams, shiftLayer, false);
                            
                            shiftParams.on('change', function() {
                                var ddx = shiftParams.get('dx') - geomDx,
                                    ddy = shiftParams.get('dy') - geomDy,
                                    shiftedGeom = shiftMercGeometry(editDialog.getGeometry(), ddx, ddy);
                                    
                                geomDx += ddx;
                                geomDy += ddy;
                                
                                editDialog.getGeometryObj().setGeometry(shiftedGeom);
                            })
                            
                            $(shiftView).on('click:start', function() {
                                dx = editDialog.get(shiftXfield);
                                dy = editDialog.get(shiftYfield);
                                
                                shiftParams.set({
                                    dx: dx,
                                    dy: dy
                                })

                                originalShiftParams = shiftParams.clone();

                                shiftLayer.addItems([{
                                    id: 1,
                                    properties: {
                                        GMX_RasterCatalogID: editDialog.get('GMX_RasterCatalogID')
                                    },
                                    geometry: shiftMercGeometry(editDialog.getGeometry(), -dx, -dy)
                                }]);
                            
                                shiftView.setState(true);
                                var layer = editDialog.getLayer();
                                var identityField = layer.properties.identityField;
                                layer.setVisibilityFilter('"' + identityField + '" <> \'' + editDialog.get(identityField) + '\'' );
                            })
                            
                            var stopShift = function() {
                                editDialog.set(shiftXfield, shiftParams.get('dx'));
                                editDialog.set(shiftYfield, shiftParams.get('dy'));
                                shiftView.setState(false);
                            }
                            
                            $(shiftView).on('click:save', stopShift)
                            
                            $(shiftView).on('click:cancel', function() {
                                shiftParams.set({
                                    dx: originalShiftParams.get('dx'),
                                    dy: originalShiftParams.get('dy')
                                })

                                stopShift();
                            });

                            return canvas[0];
                        }
                    }
                });
                return params;
            })
            
            //растровый слой и КР целиком
            nsGmx.ContextMenuController.addContextMenuElem({
                title: 'Сдвинуть слой',
                isVisible: function(context) {
                    return true;
                },
                clickCallback: function(context) {
                    var layerName = context.elem.name,
                        layer = map.layers[layerName],
                        posOffset = layer.getPositionOffset(),
                        shiftParams = new Backbone.Model({
                            dx: parseFloat(posOffset.shiftX),
                            dy: parseFloat(posOffset.shiftY)
                        }),
                        originalShiftParams = shiftParams.clone();
                    
                    if (!menu) {
                        menu = new leftMenu();
                        menu.createWorkCanvas("", function(){});
                        $(menu.workCanvas).css('width', '100%');
                    }
                    
                    var removeView = function() {
                        currentView.setState(false);
                        $(menu.workCanvas).empty();
                    }
                    
                    currentView && removeView();
                    
                    var canvas = $('<div/>').css({height: '45px', width: '100%'}).appendTo(menu.workCanvas);
                    
                    currentView = new ShiftLayerView(canvas, shiftParams, layer, true);
                    
                    $(currentView).on('click:save', function(){
                        gmxCore.loadModule('LayerProperties').done(function() {
                            var layerProperties = new nsGmx.LayerProperties();
                            layerProperties.initFromServer(layerName).done(function() {
                                var metaProperties = layerProperties.get('MetaProperties');
                                metaProperties.shiftX = {Value: shiftParams.get('dx'), Type: 'Number'};
                                metaProperties.shiftY = {Value: shiftParams.get('dy'), Type: 'Number'};
                                layerProperties.save().done(function(response) {
                                    layer.chkLayerVersion && layer.chkLayerVersion();
                                });
                            });
                        });
                        removeView();
                    })

                    $(currentView).on('click:cancel', function() {
                        layer.setPositionOffset(originalShiftParams.get('dx'), originalShiftParams.get('dy'));
                        removeView();
                    })
                }
            }, 'Layer');
        }
    };
    
    gmxCore.addModule('ShiftRastersPlugin', publicInterface, {css: 'ShiftRasterPlugin.css'});
})();