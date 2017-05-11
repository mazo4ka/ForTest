// COMMON CalendarWidget

var nsGmx = nsGmx || {};

(function($){

    nsGmx.Translations.addText("rus", { CommonCalendarWidget: {
        Timeline:    "Таймлайн",
        select: "Выберите мультивременной слой",
        sync: "Единый интервал для слоев",
        on: "Включить синхронизацию слоев",
        off: "Выключить синхронизацию слоев",
        all: "Интервал для всех слоев"
    }});

    nsGmx.Translations.addText("eng", { CommonCalendarWidget: {
        Timeline:     "Timeline",
        select: "Select temporal layer",
        sync: "Single dateinterval",
        on: "Layers sync on",
        off: "Layers sync off",
        all: "Интервал для всех слоев"
    }});

    var calendarWidgetTemplate = '' +
        '<div class="commoncalendar-container">' +
            '<div class="calendar-layers-container">' +
                '<div class="calendar-container">' +
                    '<div class="calendar-widget-container"></div>' +
                    // '<div class="calendar-sync-button"></div>' +
                '</div>' +
            '</div>' +
            '<div class="sync-switch-container">' +
                '<label class="sync-switch">' +
                    '<input type="checkbox"' +
                    '{{#if synchronyzed}}checked{{/if}}' +
                    '>' +
                    '<div class="sync-switch-slider round"></div>' +
                '</label>' +
                '<span class="sync-switch-slider-description">{{i "CommonCalendarWidget.sync"}}</span>' +
            '</div>' +
            '<div class="unsync-layers-container" style="display: none">' +
                '<select class="layersList">' +
                    '{{#each this.layers}}' +
                    '<option value="{{this.layer}}"' +
                        '{{#if this.current}} selected="selected"{{/if}}>' +
                        '{{this.layer}}' +
                    '</option>' +
                    '{{/each}}' +
                '</select>' +
            '</div>' +
        '</div>' ;
    'use strict';

    var _gtxt = nsGmx.Translations.getText.bind(nsGmx.Translations);

    var CommonCalendarModel = window.Backbone.Model.extend({
        defaults: {
            active: true,
            currentLayer: null,
            calendar: null,
            isAppended: false,
            unbindedTemporalLayers: {},
            synchronyzed: true
        }
    });

    var CommonCalendar = window.Backbone.View.extend({
        tagName: 'div',
        model: new CommonCalendarModel(),
        className: 'CommonCalendarWidget ui-widget',
        template: Handlebars.compile(calendarWidgetTemplate),
        events: {
            'change .sync-switch': 'toggleSync'
        },
        initialize: function (options) {
            var _this = this;

            this.$el.html(this.template({
                synchronyzed: _this.model.get('synchronyzed'),
                layers: [
                    {
                        layer: 'aaa'
                    },
                    {
                        layer: 'bbb',
                        current: true
                    }
                ]
            }));


            var syncButton = nsGmx.Utils.makeImageButton(this.model.get('synchronyzed') ? 'img/synch-on.png' : 'img/synch-off.png', null);
            nsGmx.Utils._title(syncButton, window._gtxt(this.model.get('synchronyzed') ? "CommonCalendarWidget.off" : "CommonCalendarWidget.on"));

            //for backward compatibility
            this.canvas = this.$el;
            this.dateInterval = new nsGmx.DateInterval();

            this.listenTo(this.model, 'change:synchronyzed', this.updateSync);
            this.listenTo(this.model, 'change:active', this.activate);
            this.listenTo(this.model, 'change:currentLayer', this.showCurrentLayer);
        },

        setDateInterval: function (dateBegin, dateEnd, layer) {
            if (layer) {
                this.setCurrentLayer(layer);
            }

            var oldBegin = this.dateInterval.get('dateBegin').valueOf(),
                oldEnd = this.dateInterval.get('dateEnd').valueOf();

            if (oldBegin === dateBegin.valueOf() && oldEnd === dateEnd.valueOf()) {
                this.trigger('change:dateInterval');
            } else {
                this.dateInterval.set({
                    dateBegin: dateBegin,
                    dateEnd: dateEnd
                });
            }
        },

        setCurrentLayer: function (layer) {
            var attrs = this.model.toJSON(),
                _layersTree = window._layersTree;

            var props = layer.getGmxProperties(),
                treeElem = _layersTree.treeModel.findElem('name', props.name).elem,
                uiElem = _layersTree.findUITreeElem(treeElem),
                span = $('.layer', $(uiElem))[0],
                active = _layersTree.getActive();
            if (uiElem !== active) {
                _layersTree.setActive(span);
            }
            this.model.set('currentLayer', props.LayerID);
        },

        getCurrentLayer: function () {
            var _layersTree = window._layersTree,
                activeNode = _layersTree.getActive(),
                layerID;

            if (!activeNode) {
                return null;
            }

            layerID = $(activeNode).attr('layerid');

            if (layerID) {
                return nsGmx.gmxMap.layersByID[layerID];
            }
        },

        log: function () {
            var f = function(list) {
                var layers = nsGmx.gmxMap.layers;

                for (var i = 0; i < layers.length; i++) {
	               var layer = layers[i],
                        props = layer.getGmxProperties(),
                        t = props.title,
                        isTemporalLayer = (layer instanceof L.gmx.VectorLayer && props.Temporal) || (props.type === 'Virtual' && layer.setDateInterval);
                        int = layer.getDateInterval();

                    if (isTemporalLayer && int) {
                        var b = int.beginDate.toString(),
                            e = int.endDate.toString();
                        list.push({
                            title: t,
                            beginDate: b,
                            endDate: e
                        });
                    }
	            }
	               console.table(list);
            };
            f([]);
        },

        getDateInterval: function () {
            return this.dateInterval;
        },

        get: function() {
            var attrs = this.model.toJSON(),
                _this = this,
                calendar;

            if (!attrs.calendar) {
                calendar = new nsGmx.CalendarWidget1({
                    minimized: false,
                    dateMin: new Date(2000, 1, 1),
                    dateMax: _this.dateInterval.get('dateEnd'),
                    dateInterval: _this.dateInterval
                });

                this.dateInterval.on('change', this.updateTemporalLayers.bind(this, null));

                this.model.set('calendar', calendar);
            this.updateTemporalLayers();
            }

            return this.model.get('calendar');
        },

        show: function() {
            var calendarDiv = this.$('.calendar-widget-container'),
                calendarCanvas = this.get().canvas;

            $(_queryMapLayers.getContainerBefore()).append(calendarCanvas[0]);

            var doAdd = function() {
                calendarDiv.append(calendarCanvas);

                var commonCanvas = this.canvas;

                // special for steppe Project
                if (nsGmx.gmxMap.properties.MapID === '0786A7383DF74C3484C55AFC3580412D') {
                    _queryMapLayers.getContainerAfter().append(commonCanvas);
                } else {
                    _queryMapLayers.getContainerBefore().append(commonCanvas);
                }
                this.model.set('isAppended', true);
            }.bind(this);

            if (!this.model.get('isAppended')) {
                //явная проверка, так как хочется быть максимально синхронными в этом методе
                if (_queryMapLayers.loadDeferred.state() === 'resolved') {
                    doAdd();
                } else {
                    _queryMapLayers.loadDeferred.then(doAdd);
                }
            }
        },

        hide: function() {
            var attrs = this.model.toJSON();
            attrs._isAppended && $(this.get().canvas).hide();
            this.model.set('isAppended', false);
        },

        bindLayer: function(layerName) {
            var attrs = this.model.toJSON(),
                unbindedTemporalLayers = attrs.unbindedTemporalLayers,
                clone = {};

            // clone object
            for (var variable in unbindedTemporalLayers) {
                if (unbindedTemporalLayers.hasOwnProperty(variable)) {
                    clone[variable] = unbindedTemporalLayers[variable];
                }
            };

            delete clone[layerName];

            this.model.set('unbindedTemporalLayers', clone);
            this.updateTemporalLayers();
        },

        unbindLayer: function(layerName) {
            var layers = nsGmx.gmxMap.layers,
                attrs = this.model.toJSON(),
                layerTitle,
                unbindedTemporalLayers = attrs.unbindedTemporalLayers,
                clone = {};

            // clone object
            for (var variable in unbindedTemporalLayers) {
                if (unbindedTemporalLayers.hasOwnProperty(variable)) {
                    clone[variable] = unbindedTemporalLayers[variable];
                }
            };

            clone[layerName] = true;
            this.model.set('unbindedTemporalLayers', clone);
        },

        _updateOneLayer: function(layer, dateBegin, dateEnd) {
            var props = layer.getGmxProperties();
            if (props.maxShownPeriod) {
                var msecPeriod = props.maxShownPeriod*24*3600*1000;
                var newDateBegin = new Date( Math.max(dateBegin.valueOf(), dateEnd.valueOf() - msecPeriod));
                layer.setDateInterval(newDateBegin, dateEnd);
            } else {
                layer.setDateInterval(dateBegin, dateEnd);
            }
        },

        showCurrentLayer: function () {
            var attrs = this.model.toJSON(),
                synchronyzed = attrs.synchronyzed,
                // currentLayer = this.getCurrentLayer(),
                currentLayer = attrs.currentLayer,
                nameSpan = this.$('.current-layer-name'),
                props, isTemporalLayer;

            if (!currentLayer) {
                if (synchronyzed) {
                    $(nameSpan).html(window._gtxt("CommonCalendarWidget.all"))
                } else {
                    $(nameSpan).html(window._gtxt("CommonCalendarWidget.select"));
                }
            } else {
                currentLayer = nsGmx.gmxMap.layersByID[currentLayer];
                props = currentLayer.getGmxProperties();
                isTemporalLayer = (currentLayer instanceof L.gmx.VectorLayer && props.Temporal) || (props.type === 'Virtual' && layer.setDateInterval);

                if (synchronyzed) {
                    $(nameSpan).html(window._gtxt("CommonCalendarWidget.all"))
                } else {
                    if (isTemporalLayer) {
                        $(nameSpan).html(currentLayer.getGmxProperties().title);
                    } else {
                        $(nameSpan).html(window._gtxt("CommonCalendarWidget.select"));
                    }
                }
            }
        },

        updateTemporalLayers: function() {
            var layers = layers || nsGmx.gmxMap.layers,
                attrs = this.model.toJSON(),
                synchronyzed = attrs.synchronyzed,
                dateBegin = this.dateInterval.get('dateBegin'),
                dateEnd = this.dateInterval.get('dateEnd'),
                // currentLayer = this.getCurrentLayer(),
                currentLayer = attrs.currentLayer,
                layersMaxDates = [],
                maxDate = null;

            if (!attrs.calendar) {return;}

            if (synchronyzed) {
                for (var i = 0, len = layers.length; i < len; i++) {
                    var layer = layers[i],
                    props = layer.getGmxProperties(),
                    isTemporalLayer = (layer instanceof L.gmx.VectorLayer && props.Temporal) || (props.type === 'Virtual' && layer.setDateInterval);

                    if (isTemporalLayer && !(props.name in attrs.unbindedTemporalLayers)) {
                        if (props.DateEnd) {
                            var localeDate = $.datepicker.parseDate('dd.mm.yy', props.DateEnd);
                            layersMaxDates.push(localeDate);
                        }

                        this._updateOneLayer(layer, dateBegin, dateEnd);
                    }
                }
            } else {
                if (currentLayer) {
                    currentLayer = nsGmx.gmxMap.layersByID[currentLayer];
                    this._updateOneLayer(currentLayer, dateBegin, dateEnd);
                } else {
                    return;
                }
            }

            if (layersMaxDates.length > 0) {
                layersMaxDates.sort(function(a, b) {
                    return b - a;
                });

                maxDate = new Date(layersMaxDates[0]);

                if (maxDate > new Date()) {
                    attrs.calendar.setDateMax(nsGmx.CalendarWidget.fromUTC(maxDate));
                } else {
                    attrs.calendar.setDateMax(new Date());
                }
                this.model.set('calendar', attrs.calendar);
            }
        },

        onDateIntervalChanged: function (e) {
            var attrs = this.model.toJSON(),
                // currentLayer = this.getCurrentLayer(),
                currentLayer = attrs.currentLayer,
                layer = e.target,
                currentName,
                layerName,
                dateInterval, dateBegin, dateEnd;

            if (!currentLayer) {
                return;
            }

            currentName = currentLayer.getGmxProperties().name;
            layerName = layer.getGmxProperties().name;

            if (layerName === currentName) {
                dateInterval = layer.getDateInterval(),
                dateBegin = dateInterval.beginDate,
                dateEnd = dateInterval.endDate;

                this.setDateInterval(dateBegin, dateEnd, layer);
            }
        },

        toggleSync: function () {
            this.model.set('synchronyzed', !this.model.get('synchronyzed'));
        },

        updateSync: function () {
            var attrs = this.model.toJSON(),
                synchronyzed = attrs.synchronyzed,
                listContainer = this.$('.unsync-layers-container'),
                layersList = this.$('.layersList');

            if (synchronyzed) {
                $(listContainer).hide();
            } else {
                $(listContainer).show();
                $(layersList).selectmenu();
            }
        }
    });

    nsGmx.CommonCalendarWidget = CommonCalendar;

})(jQuery);
