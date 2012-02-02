/** Пространство имён GeoMixer API
* @name gmxAPI
* @namespace
*/

/** Описание API JS 
* @name api
* @namespace
*/

(function()
{

var memoize = function(func)
	{
		var called = false;
		var result;
		return function()
		{
			if (!called)
			{
				result = func();
				called = true;
			}
			return result;
		}
	};

window.PI = 3.14159265358979; //устарело - обратная совместимость
window.gmxAPI = {
	clone: function (o)
	{
		if(!o || typeof(o) !== 'object')  {
			return o;
		}
		var c = 'function' === typeof(o.pop) ? [] : {};
		var p, v;
		for(p in o) {
			if(o.hasOwnProperty(p)) {
				v = o[p];
				if(v && 'object' === typeof v) {
					c[p] = gmxAPI.clone(v);
				}
				else {
					c[p] = v;
				}
			}
		}
		return c;
	}
	,
	KOSMOSNIMKI_LOCALIZED: function (rus, eng)
	{
		return (window.KOSMOSNIMKI_LANGUAGE == "English") ? eng : rus;
	}
	,
	newElement: function(tagName, props, style, setBorder)
	{
		var elem = document.createElement(tagName);
		if (props)
		{
			for (var key in props) elem[key] = props[key];
		}
		if(setBorder) {
			elem.style.border = 0;
			elem.style.margin = 0;
			elem.style.padding = 0;
		}
		if (style)
		{
			for (var key in style)
			{
				var value = style[key];
				elem.style[key] = value;
				if (key == "opacity") elem.style.filter = "alpha(opacity=" + Math.round(value*100) + ")";
			}
		}
		return elem;
	},
	newStyledDiv: function(style)
	{
		return gmxAPI.newElement("div", false, style, true);
	},
	newSpan: function(innerHTML)
	{
		return gmxAPI.newElement("span", { innerHTML: innerHTML }, null, true);
	},
	newDiv: function(className, innerHTML)
	{
		return gmxAPI.newElement("div", { className: className, innerHTML: innerHTML }, null, true);
	},
	makeImageButton: function(url, urlHover)
	{
		var btn = document.createElement("img");
		btn.setAttribute('src',url)
		btn.style.cursor = 'pointer';
		btn.style.border = 'none';
		
		if (urlHover)
		{
			btn.onmouseover = function()
			{
				this.setAttribute('src', urlHover);
			}
			btn.onmouseout = function()
			{
				this.setAttribute('src', url);
			}
		}
		
		return btn;
	},
	applyTemplate: function(template, properties)
	{
		return template.replace(/\[([a-zA-Z0-9_а-яА-Я ]+)\]/g, function()
		{
			var value = properties[arguments[1]];
			if (value != undefined)
				return "" + value;
			else
				return "[" + arguments[1] + "]";
		});
	},
	getIdentityField: function(obj)
	{
		if(!obj || !obj.parent) return 'ogc_fid';
		if(obj.properties && obj.properties.identityField) return obj.properties.identityField;
		return gmxAPI.getIdentityField(obj.parent);
	},
	swfWarning: function(attr)
	{
		gmxAPI._debugWarnings.push(attr);
	},
	addDebugWarnings: function(attr)
	{
		if(!window.gmxAPIdebugLevel) return;
		if(!attr['script']) attr['script'] = 'api.js';
		if(attr['event'] && attr['event']['lineNumber']) attr['lineNumber'] = attr['event']['lineNumber'];
		gmxAPI._debugWarnings.push(attr);
		if(window.gmxAPIdebugLevel < 10) return;
		if(attr['alert']) alert(attr['alert']);
	},
	_debugWarnings: [],
	isIE: (navigator.appName.indexOf("Microsoft") != -1),
	isChrome: (navigator.userAgent.toLowerCase().indexOf("chrome") != -1),
	show: function(div)
	{
		div.style.visibility = "visible";
		div.style.display = "block";
	}
	,
	hide: function(div)
	{
		div.style.visibility = "hidden";
		div.style.display = "none";
	},
    getTextContent: function(node)
    {
        if (typeof node.textContent != 'undefined')
            return node.textContent;
        
        var data = '';
        for (var i = 0; i < node.childNodes.length; i++)
            data += node.childNodes[i].data;
        
        return data;
    }
	,
	parseXML: function(str)
	{
		var xmlDoc;
		try
		{
			if (window.DOMParser)
			{
				parser = new DOMParser();
				xmlDoc = parser.parseFromString(str,"text/xml");
			}
			else // Internet Explorer
			{
				xmlDoc = new ActiveXObject("MSXML2.DOMDocument.3.0");
				xmlDoc.validateOnParse = false;
				xmlDoc.async = false;
				xmlDoc.loadXML(str);
			}
		}
		catch(e)
		{
			gmxAPI.addDebugWarnings({'func': 'parseXML', 'str': str, 'event': e, 'alert': e});
		}
		
		return xmlDoc;
	}
	,
	setPositionStyle: function(div, attr)
	{
		for(var key in attr) div.style[key] = attr[key];
	}
	,
	position: function(div, x, y)
	{
		div.style.left = x + "px";
		div.style.top = y + "px";
	}
	,
	bottomPosition: function(div, x, y)
	{
		div.style.left = x + "px";
		div.style.bottom = y + "px";
	}
	,
	size: function(div, w, h)
	{
		div.style.width = w + "px";
		div.style.height = h + "px";
	}
	,
	positionSize: function(div, x, y, w, h)
	{
		gmxAPI.position(div, x, y);
		gmxAPI.size(div, w, h);
	}
	,
	setVisible: function(div, flag)
	{
		(flag ? gmxAPI.show : gmxAPI.hide)(div);
	}
	,
	setBg: function(t, imageName)
	{
		if (this.isIE)
			t.style.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + imageName + "',sizingMethod='scale')";
		else
			t.style.backgroundImage = "url('" + imageName + "')";
	}
	,
	deselect: function()
	{
		if (window.disableDeselect)
			return;
		if(document.selection && document.selection.empty) 
			try { document.selection.empty(); } catch (e) {
				gmxAPI.addDebugWarnings({'func': 'deselect', 'event': e, 'alert': e});
			}
	}
	,
	compatEvent: function(event)
	{
		return event || window.event;
	}
	,
	compatTarget: function(event)
	{
		if (!event) event = window.event;
		return (event.srcElement != null) ? event.srcElement : event.target;
	}
	,
	eventX: function(event)
	{
		var theLeft = (document.documentElement && document.documentElement.scrollLeft ?
			document.documentElement.scrollLeft :
			document.body.scrollLeft);
		return gmxAPI.compatEvent(event).clientX + theLeft;
	}
	,
	eventY: function(event)
	{
		var theTop = (document.documentElement && document.documentElement.scrollTop ?
			document.documentElement.scrollTop :
			document.body.scrollTop);
		return gmxAPI.compatEvent(event).clientY + theTop;
	}
	,
	getOffsetLeft: function(div)
	{
		var ret = 0;
		while (div && div.tagName != 'HTML')
		{
		ret += div.offsetLeft;
		div = div.offsetParent;
		}
		return ret;
	}
	,
	getOffsetTop: function(div)
	{
		var ret = 0;
		while (div && div.tagName != 'HTML')
		{
		ret += div.offsetTop;
		div = div.offsetParent;
		}
		return ret;
	}
	,
	strip: function(s)
	{
		return s.replace(/^\s*/, "").replace(/\s*$/, "");
	}
	,
	parseColor: function(str)
	{
		var res = 0xffffff;
		if (!str)
			return res;
		else
		{
			var components = str.split(" ");
			if (components.length == 1)
				return parseInt("0x" + str);
			else if (components.length == 3)
				return parseInt(components[0])*0x10000 + parseInt(components[1])*0x100 + parseInt(components[2]);
			else
				return res;
		}
	}
	,
	forEachPoint: function(coords, callback)
	{
		if (coords.length == 0) return [];
		if (!coords[0].length)
		{
			if (coords.length == 2)
				return callback(coords);
			else
			{
				var ret = [];
				for (var i = 0; i < coords.length/2; i++)
					ret.push(callback([coords[i*2], coords[i*2 + 1]]));
				return ret;
			}
		}
		else
		{
			var ret = [];
			for (var i = 0; i < coords.length; i++)
				ret.push(gmxAPI.forEachPoint(coords[i], callback));
			return ret;
		}
	}
	,
	transformGeometry: function(geom, callbackX, callbackY)
	{
		return !geom ? geom : { 
			type: geom.type, 
			coordinates: gmxAPI.forEachPoint(geom.coordinates, function(p) 
			{ 
				return [callbackX(p[0]), callbackY(p[1])];
			})
		}
	}
	,
	merc_geometry: function(geom)
	{
		return gmxAPI.transformGeometry(geom, gmxAPI.merc_x, gmxAPI.merc_y);
	}
	,
	from_merc_geometry: function(geom)
	{
		return gmxAPI.transformGeometry(geom, gmxAPI.from_merc_x, gmxAPI.from_merc_y);
	}
	,
	getBounds: function(coords)
	{
		var ret = { 
			minX: 100000000, 
			minY: 100000000, 
			maxX: -100000000, 
			maxY: -100000000,
			update: function(data)
			{
				gmxAPI.forEachPoint(data, function(p)
				{
					ret.minX = Math.min(p[0], ret.minX);
					ret.minY = Math.min(p[1], ret.minY);
					ret.maxX = Math.max(p[0], ret.maxX);
					ret.maxY = Math.max(p[1], ret.maxY);
				});
			}
		}
		if (coords)
			ret.update(coords);
		return ret;
	}
	,
	boundsIntersect: function(b1, b2)	// в api.js не используется
	{
		return ((b1.minX < b2.maxX) && (b1.minY < b2.maxY) && (b2.minX < b1.maxX) && (b2.minY < b1.maxY));
	}
	,
	isRectangle: function(coords)
	{
		return (coords && coords[0].length == 5
			&& coords[0][4][0] == coords[0][0][0] && coords[0][4][1] == coords[0][0][1]
			&& ((coords[0][0][0] == coords[0][1][0]) || (coords[0][0][1] == coords[0][1][1]))
			&& ((coords[0][1][0] == coords[0][2][0]) || (coords[0][1][1] == coords[0][2][1]))
			&& ((coords[0][2][0] == coords[0][3][0]) || (coords[0][2][1] == coords[0][3][1]))
			&& ((coords[0][3][0] == coords[0][4][0]) || (coords[0][3][1] == coords[0][4][1]))
		);
	}
	,
	getScale: function(z)
	{
		return Math.pow(2, -z)*156543.033928041;
	}
	,
	deg_rad: function(ang)
	{
		return ang * (Math.PI/180.0);
	}
	,
	deg_decimal: function(rad)
	{
		return (rad/Math.PI) * 180.0;
	}
	,
	merc_x: function(lon)
	{
		var r_major = 6378137.000;
		return r_major * gmxAPI.deg_rad(lon);
	}
	,
	from_merc_x: function(x)
	{
		var r_major = 6378137.000;
		return gmxAPI.deg_decimal(x/r_major);
	}
	,
	merc_y: function(lat)
	{
		if (lat > 89.5)
			lat = 89.5;
		if (lat < -89.5)
			lat = -89.5;
		var r_major = 6378137.000;
		var r_minor = 6356752.3142;
		var temp = r_minor / r_major;
		var es = 1.0 - (temp * temp);
		var eccent = Math.sqrt(es);
		var phi = gmxAPI.deg_rad(lat);
		var sinphi = Math.sin(phi);
		var con = eccent * sinphi;
		var com = .5 * eccent;
		con = Math.pow(((1.0-con)/(1.0+con)), com);
		var ts = Math.tan(.5 * ((Math.PI*0.5) - phi))/con;
		var y = 0 - r_major * Math.log(ts);
		return y;
	}
	,
	from_merc_y: function(y)
	{
		var r_major = 6378137.000;
		var r_minor = 6356752.3142;
		var temp = r_minor / r_major;
		var es = 1.0 - (temp * temp);
		var eccent = Math.sqrt(es);
		var ts = Math.exp(-y/r_major);
		var HALFPI = 1.5707963267948966;

		var eccnth, Phi, con, dphi;
		eccnth = 0.5 * eccent;

		Phi = HALFPI - 2.0 * Math.atan(ts);

		var N_ITER = 15;
		var TOL = 1e-7;
		var i = N_ITER;
		dphi = 0.1;
		while ((Math.abs(dphi)>TOL)&&(--i>0))
		{
			con = eccent * Math.sin (Phi);
			dphi = HALFPI - 2.0 * Math.atan(ts * Math.pow((1.0 - con)/(1.0 + con), eccnth)) - Phi;
			Phi += dphi;
		}

		return gmxAPI.deg_decimal(Phi);
	}
	,
	merc: function(lon,lat)
	{
		return [gmxAPI.merc_x(lon), gmxAPI.merc_y(lat)];
	}
	,
	from_merc: function(x,y)
	{
		return [gmxAPI.from_merc_x(x), gmxAPI.from_merc_y(y)];
	}
	,
	distVincenty: function(lon1,lat1,lon2,lat2)
	{
		var p1 = new Object();
		var p2 = new Object();

		p1.lon =  gmxAPI.deg_rad(lon1);
		p1.lat =  gmxAPI.deg_rad(lat1);
		p2.lon =  gmxAPI.deg_rad(lon2);
		p2.lat =  gmxAPI.deg_rad(lat2);

		var a = 6378137, b = 6356752.3142,  f = 1/298.257223563;  // WGS-84 ellipsiod
		var L = p2.lon - p1.lon;
		var U1 = Math.atan((1-f) * Math.tan(p1.lat));
		var U2 = Math.atan((1-f) * Math.tan(p2.lat));
		var sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
		var sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);

		var lambda = L, lambdaP = 2*Math.PI;
		var iterLimit = 20;
		while (Math.abs(lambda-lambdaP) > 1e-12 && --iterLimit>0) {
				var sinLambda = Math.sin(lambda), cosLambda = Math.cos(lambda);
				var sinSigma = Math.sqrt((cosU2*sinLambda) * (cosU2*sinLambda) + 
					(cosU1*sinU2-sinU1*cosU2*cosLambda) * (cosU1*sinU2-sinU1*cosU2*cosLambda));
				if (sinSigma==0) return 0;
				var cosSigma = sinU1*sinU2 + cosU1*cosU2*cosLambda;
				var sigma = Math.atan2(sinSigma, cosSigma);
				var sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
				var cosSqAlpha = 1 - sinAlpha*sinAlpha;
				var cos2SigmaM = cosSigma - 2*sinU1*sinU2/cosSqAlpha;
				if (isNaN(cos2SigmaM)) cos2SigmaM = 0;
				var C = f/16*cosSqAlpha*(4+f*(4-3*cosSqAlpha));
				lambdaP = lambda;
				lambda = L + (1-C) * f * sinAlpha *
					(sigma + C*sinSigma*(cos2SigmaM+C*cosSigma*(-1+2*cos2SigmaM*cos2SigmaM)));
		}
		if (iterLimit==0) return NaN

		var uSq = cosSqAlpha * (a*a - b*b) / (b*b);
		var A = 1 + uSq/16384*(4096+uSq*(-768+uSq*(320-175*uSq)));
		var B = uSq/1024 * (256+uSq*(-128+uSq*(74-47*uSq)));
		var deltaSigma = B*sinSigma*(cos2SigmaM+B/4*(cosSigma*(-1+2*cos2SigmaM*cos2SigmaM)-
				B/6*cos2SigmaM*(-3+4*sinSigma*sinSigma)*(-3+4*cos2SigmaM*cos2SigmaM)));
		var s = b*A*(sigma-deltaSigma);

		s = s.toFixed(3);
		return s;
	}

	,
	DegToRad: function(deg)
	{
        return (deg / 180.0 * Math.PI)
	}
	,
	RadToDeg: function(rad)
	{
		return (rad / Math.PI * 180.0)
	}
	,
	worldWidthMerc: 20037508,
	sm_a: 6378137.0,
    sm_b: 6356752.314,
    //sm_EccSquared: 6.69437999013e-03,
    UTMScaleFactor: 0.9996
	,
	ArcLengthOfMeridian: function(rad)
	{
		var alpha, beta, gamma, delta, epsilon, n;
		var result;
		n = (gmxAPI.sm_a - gmxAPI.sm_b) / (gmxAPI.sm_a + gmxAPI.sm_b);
		alpha = ((gmxAPI.sm_a + gmxAPI.sm_b) / 2.0)
		   * (1.0 + (Math.pow (n, 2.0) / 4.0) + (Math.pow (n, 4.0) / 64.0));
		beta = (-3.0 * n / 2.0) + (9.0 * Math.pow (n, 3.0) / 16.0)
		   + (-3.0 * Math.pow (n, 5.0) / 32.0);
		gamma = (15.0 * Math.pow (n, 2.0) / 16.0)
			+ (-15.0 * Math.pow (n, 4.0) / 32.0);
		delta = (-35.0 * Math.pow (n, 3.0) / 48.0)
			+ (105.0 * Math.pow (n, 5.0) / 256.0);
		epsilon = (315.0 * Math.pow (n, 4.0) / 512.0);

		result = alpha
			* (phi + (beta * Math.sin (2.0 * phi))
				+ (gamma * Math.sin (4.0 * phi))
				+ (delta * Math.sin (6.0 * phi))
				+ (epsilon * Math.sin (8.0 * phi)));

		return result;
	}
	,
	UTMCentralMeridian: function(zone)
	{
        var cmeridian = gmxAPI.DegToRad (-183.0 + (zone * 6.0));
        return cmeridian;
	}
	,
	FootpointLatitude: function(y)
	{
		var y_, alpha_, beta_, gamma_, delta_, epsilon_, n;
		var result;

		n = (gmxAPI.sm_a - gmxAPI.sm_b) / (gmxAPI.sm_a + gmxAPI.sm_b);
		alpha_ = ((gmxAPI.sm_a + gmxAPI.sm_b) / 2.0)
			* (1 + (Math.pow (n, 2.0) / 4) + (Math.pow (n, 4.0) / 64));
		y_ = y / alpha_;
		beta_ = (3.0 * n / 2.0) + (-27.0 * Math.pow (n, 3.0) / 32.0)
			+ (269.0 * Math.pow (n, 5.0) / 512.0);
		gamma_ = (21.0 * Math.pow (n, 2.0) / 16.0)
			+ (-55.0 * Math.pow (n, 4.0) / 32.0);
		delta_ = (151.0 * Math.pow (n, 3.0) / 96.0)
			+ (-417.0 * Math.pow (n, 5.0) / 128.0);
		epsilon_ = (1097.0 * Math.pow (n, 4.0) / 512.0);
		result = y_ + (beta_ * Math.sin (2.0 * y_))
			+ (gamma_ * Math.sin (4.0 * y_))
			+ (delta_ * Math.sin (6.0 * y_))
			+ (epsilon_ * Math.sin (8.0 * y_));

		return result;
	}
	,
	MapLatLonToXY: function(phi, lambda, lambda0, xy)
	{
		var N, nu2, ep2, t, t2, l;
		var l3coef, l4coef, l5coef, l6coef, l7coef, l8coef;
		var tmp;

		ep2 = (Math.pow (gmxAPI.sm_a, 2.0) - Math.pow (gmxAPI.sm_b, 2.0)) / Math.pow (gmxAPI.sm_b, 2.0);
		nu2 = ep2 * Math.pow (Math.cos (phi), 2.0);
		N = Math.pow (gmxAPI.sm_a, 2.0) / (gmxAPI.sm_b * Math.sqrt (1 + nu2));
		t = Math.tan (phi);
		t2 = t * t;
		tmp = (t2 * t2 * t2) - Math.pow (t, 6.0);
		l = lambda - lambda0;
		l3coef = 1.0 - t2 + nu2;

		l4coef = 5.0 - t2 + 9 * nu2 + 4.0 * (nu2 * nu2);

		l5coef = 5.0 - 18.0 * t2 + (t2 * t2) + 14.0 * nu2
			- 58.0 * t2 * nu2;

		l6coef = 61.0 - 58.0 * t2 + (t2 * t2) + 270.0 * nu2
			- 330.0 * t2 * nu2;

		l7coef = 61.0 - 479.0 * t2 + 179.0 * (t2 * t2) - (t2 * t2 * t2);

		l8coef = 1385.0 - 3111.0 * t2 + 543.0 * (t2 * t2) - (t2 * t2 * t2);

		xy[0] = N * Math.cos (phi) * l
			+ (N / 6.0 * Math.pow (Math.cos (phi), 3.0) * l3coef * Math.pow (l, 3.0))
			+ (N / 120.0 * Math.pow (Math.cos (phi), 5.0) * l5coef * Math.pow (l, 5.0))
			+ (N / 5040.0 * Math.pow (Math.cos (phi), 7.0) * l7coef * Math.pow (l, 7.0));

		xy[1] = ArcLengthOfMeridian (phi)
			+ (t / 2.0 * N * Math.pow (Math.cos (phi), 2.0) * Math.pow (l, 2.0))
			+ (t / 24.0 * N * Math.pow (Math.cos (phi), 4.0) * l4coef * Math.pow (l, 4.0))
			+ (t / 720.0 * N * Math.pow (Math.cos (phi), 6.0) * l6coef * Math.pow (l, 6.0))
			+ (t / 40320.0 * N * Math.pow (Math.cos (phi), 8.0) * l8coef * Math.pow (l, 8.0));

		return;
	}
	,
	MapXYToLatLon: function(x, y, lambda0, philambda)
	{
		var phif, Nf, Nfpow, nuf2, ep2, tf, tf2, tf4, cf;
		var x1frac, x2frac, x3frac, x4frac, x5frac, x6frac, x7frac, x8frac;
		var x2poly, x3poly, x4poly, x5poly, x6poly, x7poly, x8poly;

		phif = FootpointLatitude (y);
		ep2 = (Math.pow (gmxAPI.sm_a, 2.0) - Math.pow (gmxAPI.sm_b, 2.0))
			  / Math.pow (gmxAPI.sm_b, 2.0);
		cf = Math.cos (phif);
		nuf2 = ep2 * Math.pow (cf, 2.0);
		Nf = Math.pow (gmxAPI.sm_a, 2.0) / (gmxAPI.sm_b * Math.sqrt (1 + nuf2));
		Nfpow = Nf;
		tf = Math.tan (phif);
		tf2 = tf * tf;
		tf4 = tf2 * tf2;
		x1frac = 1.0 / (Nfpow * cf);

		Nfpow *= Nf;
		x2frac = tf / (2.0 * Nfpow);

		Nfpow *= Nf;
		x3frac = 1.0 / (6.0 * Nfpow * cf);

		Nfpow *= Nf;
		x4frac = tf / (24.0 * Nfpow);

		Nfpow *= Nf;
		x5frac = 1.0 / (120.0 * Nfpow * cf);

		Nfpow *= Nf;
		x6frac = tf / (720.0 * Nfpow);

		Nfpow *= Nf;
		x7frac = 1.0 / (5040.0 * Nfpow * cf);

		Nfpow *= Nf;
		x8frac = tf / (40320.0 * Nfpow);

		x2poly = -1.0 - nuf2;

		x3poly = -1.0 - 2 * tf2 - nuf2;

		x4poly = 5.0 + 3.0 * tf2 + 6.0 * nuf2 - 6.0 * tf2 * nuf2
			- 3.0 * (nuf2 *nuf2) - 9.0 * tf2 * (nuf2 * nuf2);

		x5poly = 5.0 + 28.0 * tf2 + 24.0 * tf4 + 6.0 * nuf2 + 8.0 * tf2 * nuf2;

		x6poly = -61.0 - 90.0 * tf2 - 45.0 * tf4 - 107.0 * nuf2
			+ 162.0 * tf2 * nuf2;

		x7poly = -61.0 - 662.0 * tf2 - 1320.0 * tf4 - 720.0 * (tf4 * tf2);

		x8poly = 1385.0 + 3633.0 * tf2 + 4095.0 * tf4 + 1575 * (tf4 * tf2);
			
		philambda[0] = phif + x2frac * x2poly * (x * x)
			+ x4frac * x4poly * Math.pow (x, 4.0)
			+ x6frac * x6poly * Math.pow (x, 6.0)
			+ x8frac * x8poly * Math.pow (x, 8.0);
			
		philambda[1] = lambda0 + x1frac * x
			+ x3frac * x3poly * Math.pow (x, 3.0)
			+ x5frac * x5poly * Math.pow (x, 5.0)
			+ x7frac * x7poly * Math.pow (x, 7.0);
			
		return;
	}
	,
	LatLonToUTMXY: function(lat, lon, zone, xy)
	{
		gmxAPI.MapLatLonToXY (lat, lon, gmxAPI.UTMCentralMeridian (zone), xy);

		xy[0] = xy[0] * gmxAPI.UTMScaleFactor + 500000.0;
		xy[1] = xy[1] * gmxAPI.UTMScaleFactor;
		if (xy[1] < 0.0)
			xy[1] = xy[1] + 10000000.0;

		return zone;
	}
	,
	UTMXYToLatLon: function(x, y, zone, southhemi, latlon)
	{
		var cmeridian;
			
		x -= 500000.0;
		x /= gmxAPI.UTMScaleFactor;
			
		if (southhemi)
		y -= 10000000.0;
				
		y /= gmxAPI.UTMScaleFactor;

		cmeridian = gmxAPI.UTMCentralMeridian (zone);
		gmxAPI.MapXYToLatLon (x, y, cmeridian, latlon);
			
		return;
	}
	,
	truncate9: function(x)
	{
        return ("" + x).substring(0, 9);
	}
	,
	prettifyDistance: function(length)
	{
		if (length < 1000)
			return Math.round(length) + gmxAPI.KOSMOSNIMKI_LOCALIZED(" м", " m");
		if (length < 100000)
			return (Math.round(length/10)/100) + gmxAPI.KOSMOSNIMKI_LOCALIZED(" км", " km");
		return Math.round(length/1000) + gmxAPI.KOSMOSNIMKI_LOCALIZED(" км", " km");
	}
	,
	prettifyArea: function(area)
	{
		if (area < 100000)
			return Math.round(area) + gmxAPI.KOSMOSNIMKI_LOCALIZED(" кв. м", " sq. m");
		if (area < 100000000)
			return ("" + (Math.round(area/10000)/100)).replace(".", ",") + gmxAPI.KOSMOSNIMKI_LOCALIZED(" кв. км", " sq.km");
		return (Math.round(area/1000000)) + gmxAPI.KOSMOSNIMKI_LOCALIZED(" кв. км", " sq. km");
	}
	,
	fragmentArea: function(points)
	{
		var pts = [];
		for (var i in points)
			pts.push([points[i][0], Math.sin(points[i][1]*Math.PI/180)]);
		var area = 0;
		for (var i in pts)
		{
			var ipp = (i == (pts.length - 1) ? 0 : (parseInt(i) + 1));
			area += (pts[i][0]*pts[ipp][1] - pts[ipp][0]*pts[i][1]);
		}
		var out = Math.abs(area*gmxAPI.lambertCoefX*gmxAPI.lambertCoefY/2);
		return out;
	}
	,
	fragmentAreaMercator: function(points)
	{
		var pts = [];
		for (var i in points)
			pts.push([gmxAPI.from_merc_x(points[i][0]), gmxAPI.from_merc_y(points[i][1])]);
		return gmxAPI.fragmentArea(pts);
	}
	,
	pad2: function(t)
	{
		return (t < 10) ? ("0" + t) : ("" + t);
	}
	,
	strToDate: function(str)
	{
		var arr = str.split(' ');
		var arr1 = arr[0].split('.');
		var d = arr1[0];
		var m = arr1[1] - 1;
		var y = arr1[2];
		if(d > 99) d = arr1[2], y = arr1[0];
		var ret = new Date(y, m, d);
		if(arr.length > 1) {
			arr1 = arr[1].split(':');
			ret.setHours((arr1.length > 0 ? arr1[0] : 0), (arr1.length > 1 ? arr1[1] : 0), (arr1.length > 2 ? arr1[2] : 0), (arr1.length > 3 ? arr1[3] : 0));
		}
		return ret;
	}
	,
	trunc: function(x)
	{
		return ("" + (Math.round(10000000*x)/10000000 + 0.00000001)).substring(0, 9);
	}
	,
	formatDegreesSimple: function(angle)
	{
		if (angle > 180)
			angle -= 360;
		var str = "" + Math.round(angle*100000)/100000;
		if (str.indexOf(".") == -1)
			str += ".";
		for (var i = str.length; i < 8; i++)
			str += "0";
		return str;
	}
	,
	formatDegrees: function(angle)
	{
		angle = Math.round(10000000*angle)/10000000 + 0.00000001;
		var a1 = Math.floor(angle);
		var a2 = Math.floor(60*(angle - a1));
		var a3 = gmxAPI.pad2(3600*(angle - a1 - a2/60)).substring(0, 2);
		return gmxAPI.pad2(a1) + "°" + gmxAPI.pad2(a2) + "'" + a3 + '"';
	}
	,
	formatCoordinates: function(x, y)
	{
		var lat_ = gmxAPI.from_merc_y(y);
		var lon_ = gmxAPI.from_merc_x(x);
		return  gmxAPI.formatDegrees(Math.abs(lat_)) + (lat_ > 0 ? " N, " : " S, ") + 
			gmxAPI.formatDegrees(Math.abs(lon_)) + (lon_ > 0 ? " E" : " W");
	}
	,
	formatCoordinates2: function(x, y)
	{
		var lat_ = gmxAPI.from_merc_y(y);
		var lon_ = gmxAPI.from_merc_x(x);
		return  gmxAPI.trunc(Math.abs(lat_)) + (lat_ > 0 ? " N, " : " S, ") + 
			gmxAPI.trunc(Math.abs(lon_)) + (lon_ > 0 ? " E" : " W");
	}
	,
	forEachPointAmb: function(arg, callback)
	{
		gmxAPI.forEachPoint(arg.length ? arg : arg.coordinates, callback);
	}
	,
	geoLength: function(arg1, arg2, arg3, arg4)
	{
		if (arg4)
			return gmxAPI.distVincenty(arg1, arg2, arg3, arg4);
		var currentX = false, currentY = false, length = 0;
		gmxAPI.forEachPointAmb(arg1, function(p)
		{
			if (currentX && currentY)
				length += parseFloat(gmxAPI.distVincenty(currentX, currentY, p[0], p[1]));
			currentX = p[0];
			currentY = p[1];
		});
		return length;
	}
	,
	geoArea: function(arg)
	{
		if (arg.type == "MULTIPOLYGON")
		{
			var ret = 0;
			for (var i = 0; i < arg.coordinates.length; i++)
				ret += gmxAPI.geoArea({ type: "POLYGON", coordinates: arg.coordinates[i] });
			return ret;
		}
		else if (arg.type == "POLYGON")
		{
			var ret = gmxAPI.geoArea(arg.coordinates[0]);
			for (var i = 1; i < arg.coordinates.length; i++)
				ret -= gmxAPI.geoArea(arg.coordinates[i]);
			return ret;
		}
		else if (arg.length)
		{
			var pts = [];
			gmxAPI.forEachPoint(arg, function(p) { pts.push(p); });
			return gmxAPI.fragmentArea(pts);
		}
		else
			return 0;
	}
	,
	geoCenter: function(arg1, arg2, arg3, arg4)
	{
		var minX, minY, maxX, maxY;
		if (arg4)
		{
			minX = Math.min(arg1, arg3);
			minY = Math.min(arg2, arg4);
			maxX = Math.max(arg1, arg3);
			maxY = Math.max(arg2, arg4);
		}
		else
		{
			minX = 1000;
			minY = 1000;
			maxX = -1000;
			maxY = -1000;
			gmxAPI.forEachPointAmb(arg1, function(p)
			{
				minX = Math.min(minX, p[0]);
				minY = Math.min(minY, p[1]);
				maxX = Math.max(maxX, p[0]);
				maxY = Math.max(maxY, p[1]);
			});
		}
		return [
			gmxAPI.from_merc_x((gmxAPI.merc_x(minX) + gmxAPI.merc_x(maxX))/2),
			gmxAPI.from_merc_y((gmxAPI.merc_y(minY) + gmxAPI.merc_y(maxY))/2)
		];
	}
	,
	chkPointCenterX: function(centerX) {
		if(typeof(centerX) != 'number') centerX = 0;
		else {
			centerX = centerX % 360;
			if(centerX < -180) centerX += 360;
			if(centerX > 180) centerX -= 360;
		}
		return centerX;
	}
	,
	convertCoords: function(coordsStr)
	{
		var res = [],
			coordsPairs = this.strip(coordsStr).replace(/\s+/,' ').split(' ');

		if (coordsStr.indexOf(',') == -1)
		{
			for (var j = 0; j < Math.floor(coordsPairs.length / 2); j++)
				res.push([Number(coordsPairs[2 * j]), Number(coordsPairs[2 * j + 1])])
		}
		else
		{
			for (var j = 0; j < coordsPairs.length; j++)
			{
				var parsedCoords = coordsPairs[j].split(',');			
				res.push([Number(parsedCoords[0]), Number(parsedCoords[1])])
			}
		}

		return res;
	}
	,
	parseGML: function(response)
	{
		var geometries = [],
			strResp = response.replace(/[\t\n\r]/g, ' '),
			strResp = strResp.replace(/\s+/g, ' '),
			coordsTag = /<gml:coordinates>([-0-9.,\s]*)<\/gml:coordinates>/,
			pointTag = /<gml:Point>[\s]*<gml:coordinates>[-0-9.,\s]*<\/gml:coordinates>[\s]*<\/gml:Point>/g,
			lineTag = /<gml:LineString>[\s]*<gml:coordinates>[-0-9.,\s]*<\/gml:coordinates>[\s]*<\/gml:LineString>/g,
			polyTag = /<gml:Polygon>[\s]*(<gml:outerBoundaryIs>[\s]*<gml:LinearRing>[\s]*<gml:coordinates>[-0-9.,\s]*<\/gml:coordinates>[\s]*<\/gml:LinearRing>[\s]*<\/gml:outerBoundaryIs>){0,1}[\s]*(<gml:innerBoundaryIs>[\s]*<gml:LinearRing>[\s]*<gml:coordinates>[-0-9.,\s]*<\/gml:coordinates>[\s]*<\/gml:LinearRing>[\s]*<\/gml:innerBoundaryIs>){0,1}[\s]*<\/gml:Polygon>/g,
			outerTag = /<gml:outerBoundaryIs>(.*)<\/gml:outerBoundaryIs>/,
			innerTag = /<gml:innerBoundaryIs>(.*)<\/gml:innerBoundaryIs>/;

		if (strResp.indexOf('gml:posList') > -1)
		{
			coordsTag = /<gml:posList>([-0-9.,\s]*)<\/gml:posList>/,
			pointTag = /<gml:Point>[\s]*<gml:posList>[-0-9.,\s]*<\/gml:posList>[\s]*<\/gml:Point>/g,
			lineTag = /<gml:LineString>[\s]*<gml:posList>[-0-9.,\s]*<\/gml:posList>[\s]*<\/gml:LineString>/g,
			polyTag = /<gml:Polygon>[\s]*(<gml:exterior>[\s]*<gml:LinearRing>[\s]*<gml:posList>[-0-9.,\s]*<\/gml:posList>[\s]*<\/gml:LinearRing>[\s]*<\/gml:exterior>){0,1}[\s]*(<gml:interior>[\s]*<gml:LinearRing>[\s]*<gml:posList>[-0-9.,\s]*<\/gml:posList>[\s]*<\/gml:LinearRing>[\s]*<\/gml:interior>){0,1}[\s]*<\/gml:Polygon>/g,
			outerTag = /<gml:exterior>(.*)<\/gml:exterior>/,
			innerTag = /<gml:interior>(.*)<\/gml:interior>/;
		}
		else if (strResp.indexOf('<kml') > -1)
		{
			coordsTag = /<coordinates>([-0-9.,\s]*)<\/coordinates>/,
			pointTag = /<Point>[^P]*<\/Point>/g,
			lineTag = /<LineString>[^L]*<\/LineString>/g,
			polyTag = /<Polygon>[^P]*<\/Polygon>/g,
			outerTag = /<outerBoundaryIs>(.*)<\/outerBoundaryIs>/,
			innerTag = /<innerBoundaryIs>(.*)<\/innerBoundaryIs>/;
		}

		strResp = strResp.replace(pointTag, function(str)
		{
			var coords = gmxAPI.getTagValue(str, coordsTag),
				parsedCoords = gmxAPI.convertCoords(coords);
			
			geometries.push({type: 'POINT', coordinates:parsedCoords[0]})
			
			return '';
		})

		strResp = strResp.replace(lineTag, function(str)
		{
			var coords = gmxAPI.getTagValue(str, coordsTag),
				parsedCoords = gmxAPI.convertCoords(coords)

			geometries.push({type: 'LINESTRING', coordinates: parsedCoords});
			
			return '';
		})

		strResp = strResp.replace(polyTag, function(str)
		{
			var coords = [],
				outerCoords = gmxAPI.getTagValue(str, outerTag),
				innerCoords = gmxAPI.getTagValue(str, innerTag),
				resultCoords = [];
			
			if (outerCoords)
				coords.push(gmxAPI.getTagValue(outerCoords, coordsTag));
			
			if (innerCoords)
				coords.push(gmxAPI.getTagValue(innerCoords, coordsTag));
			
			for (var index = 0; index < coords.length; index++)
				resultCoords.push(gmxAPI.convertCoords(coords[index]))
			
			geometries.push({type: 'POLYGON', coordinates: resultCoords});
			
			return '';
		})

		return geometries;
	}
	,
	createGML: function(geometries, format)
	{
		if (typeof geometries == 'undefined' || geometries == null || geometries.length == 0)
			return '';

		var coordsSeparator = ',',
			coordsTag = '<gml:coordinates>_REPLACE_<\/gml:coordinates>',
			pointTag = '<gml:Point><gml:coordinates>_REPLACE_<\/gml:coordinates><\/gml:Point>',
			lineTag = '<gml:LineString><gml:coordinates>_REPLACE_<\/gml:coordinates><\/gml:LineString>',
			polyTag = '<gml:Polygon>_REPLACE_<\/gml:Polygon>',
			outerTag = '<gml:outerBoundaryIs><gml:LinearRing><gml:coordinates>_REPLACE_<\/gml:coordinates><\/gml:LinearRing><\/gml:outerBoundaryIs>',
			innerTag = '<gml:innererBoundaryIs><gml:LinearRing><gml:coordinates>_REPLACE_<\/gml:coordinates><\/gml:LinearRing><\/gml:innerBoundaryIs>',
			elementTag = '<gml:featureMember>_REPLACE_<\/gml:featureMember>',
			headerTag = '<?xml version=\"1.0\" encoding=\"UTF-8\" ?>\n<wfs:FeatureCollection xmlns:ogc=\"http://www.opengis.net/ogc\" xmlns:gml=\"http://www.opengis.net/gml\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns:ows=\"http://www.opengis.net/ows\" xmlns:wfs=\"http://www.opengis.net/wfs\">\n_REPLACE_\n</wfs:FeatureCollection>';

		if (typeof format != 'undefined' && format == 'gml3')
		{
			coordsSeparator = ' ',
			coordsTag = '<gml:posList>_REPLACE_<\/gml:posList>',
			pointTag = '<gml:Point><gml:posList>_REPLACE_<\/gml:posList><\/gml:Point>',
			lineTag = '<gml:LineString><gml:posList>_REPLACE_<\/gml:posList><\/gml:LineString>',
			polyTag = '<gml:Polygon>_REPLACE_<\/gml:Polygon>',
			outerTag = '<gml:exterior><gml:LinearRing><gml:posList>_REPLACE_<\/gml:posList><\/gml:LinearRing><\/gml:exterior>',
			innerTag = '<gml:interior><gml:LinearRing><gml:posList>_REPLACE_<\/gml:posList><\/gml:LinearRing><\/gml:interior>',
			elementTag = '<gml:featureMember>_REPLACE_<\/gml:featureMember>',
			headerTag = '<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<wfs:FeatureCollection xmlns:ogc=\"http://www.opengis.net/ogc\" xmlns:gml=\"http://www.opengis.net/gml\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns:ows=\"http://www.opengis.net/ows\" xmlns:wfs=\"http://www.opengis.net/wfs\">\n_REPLACE_\n</wfs:FeatureCollection>';
		}
		else if (typeof format != 'undefined' && format == 'kml')
		{
			coordsTag = '<coordinates>_REPLACE_<\/coordinates>',
			pointTag = '<Point><coordinates>_REPLACE_<\/coordinates><\/Point>',
			lineTag = '<LineString><coordinates>_REPLACE_<\/coordinates><\/LineString>',
			polyTag = '<Polygon>_REPLACE_<\/Polygon>',
			outerTag = '<outerBoundaryIs><LinearRing><coordinates>_REPLACE_<\/coordinates><\/LinearRing><\/outerBoundaryIs>',
			innerTag = '<innererBoundaryIs><LinearRing><coordinates>_REPLACE_<\/coordinates><\/LinearRing><\/innerBoundaryIs>',
			elementTag = '<Placemark>_REPLACE_<\/Placemark>',
			headerTag = '<?xml version=\"1.0\" encoding=\"UTF-8\" ?> <kml xmlns=\"http://earth.google.com/kml/2.0\"> <Document>\n_REPLACE_\n</Document>';
		}

		var elementsStr = '';

		for (var i = 0; i < geometries.length; i++)
		{
			var geometriesStr = '';
			
			if (geometries[i].type == 'POINT')
			{
				var coordsStr = geometries[i].coordinates.join(coordsSeparator);
				
				geometriesStr = pointTag.replace('_REPLACE_', coordsStr);
			}
			else if (geometries[i].type == 'LINESTRING')
			{
				var coordsStr = '';
				
				for (var j = 0; j < geometries[i].coordinates.length; j++)
				{
					if (j == 0)
						coordsStr += geometries[i].coordinates[j].join(coordsSeparator)
					else
						coordsStr += ' ' + geometries[i].coordinates[j].join(coordsSeparator)
				}
				
				geometriesStr = lineTag.replace('_REPLACE_', coordsStr);
			}
			else if (geometries[i].type == 'POLYGON')
			{
				var bounds = [outerTag, innerTag];
				
				for (var k = 0; k < geometries[i].coordinates.length; k++)
				{
					var coordsStr = '';
					
					for (var j = 0; j < geometries[i].coordinates[k].length; j++)
					{
						if (j == 0)
							coordsStr += geometries[i].coordinates[k][j].join(coordsSeparator)
						else
							coordsStr += ' ' + geometries[i].coordinates[k][j].join(coordsSeparator)
					}
					
					geometriesStr = bounds[k].replace('_REPLACE_', coordsStr);
				}
				
				geometriesStr = polyTag.replace('_REPLACE_', geometriesStr);
			}
			
			elementsStr += elementTag.replace('_REPLACE_', geometriesStr);
		}

		var xmlStr = headerTag.replace('_REPLACE_', elementsStr);

		return xmlStr;
	}
	,
	getTagValue: function(str, tag)
	{
		var res = null;
		str.replace(tag, function()
		{
			res = arguments[1];
		})
		return res;
	}
	,
	parseCoordinates: function(text, callback)
	{
		// should understand the following formats:
		// 55.74312, 37.61558
		// 55°44'35" N, 37°36'56" E
		// 4187347, 7472103

		if (text.match(/[йцукенгшщзхъфывапролджэячсмитьбюЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮqrtyuiopadfghjklzxcvbmQRTYUIOPADFGHJKLZXCVBM_]/))
			return false;
		if (text.indexOf(" ") != -1)
			text = text.replace(/,/g, ".");
		var regex = /(-?\d+(\.\d+)?)([^\d\-]*)/g;
		var results = [];
		while (t = regex.exec(text))
			results.push(t[1]);
		if (results.length < 2)
			return false;
		var ii = Math.floor(results.length/2);
		var x = 0;
		var mul = 1;
		for (var i = 0; i < ii; i++)
		{
			x += parseFloat(results[i])*mul;
			mul /= 60;
		}
		var y = 0;
		mul = 1;
		for (var i = ii; i < results.length; i++)
		{
			y += parseFloat(results[i])*mul;
			mul /= 60;
		}
		if ((Math.abs(x) < 180) && (Math.abs(y) < 180))
		{	
			var tx = x, ty = y;
			x = gmxAPI.merc_x(ty);
			y = gmxAPI.merc_y(tx);
		}
		if (Math.max(text.indexOf("N"), text.indexOf("S")) > Math.max(text.indexOf("E"), text.indexOf("W")))
		{
			var t = gmxAPI.merc_y(gmxAPI.from_merc_x(x));
			x = gmxAPI.merc_x(gmxAPI.from_merc_y(y));
			y = t;
		}
		if (text.indexOf("W") != -1)
			x = -x;
		if (text.indexOf("S") != -1)
			y = -y;
		callback(gmxAPI.from_merc_x(x), gmxAPI.from_merc_y(y));
		return true;
	}
	,
	parseUri: function(str)
	{
		var	o   = {
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
			},
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
	}
	,
	memoize : memoize
	,
	getScriptURL: function(scriptName)
	{
		var scripts1 = document.getElementsByTagName("script");
		for (var i = 0; i < scripts1.length; i++)
		{
			var src = scripts1[i].getAttribute("src");
			if (src && (src.indexOf(scriptName) != -1))
				return src;
		}
		return false;
	}
	,
	getScriptBase: function(scriptName)
	{
		var url = gmxAPI.getScriptURL(scriptName);
		return url.substring(0, url.indexOf(scriptName));
	}
	,
	getBaseMapParam: function(paramName, defaultValue)
	{
		if (typeof window.baseMap !== 'object') window.baseMap = {};
		if (!window.baseMap[paramName]) window.baseMap[paramName] = defaultValue;
		return window.baseMap[paramName];
		//return (window.baseMap && window.baseMap[paramName]) ? window.baseMap[paramName] : defaultValue;
	}
	,
	getHostAndPath: function(url)
	{
		var u = gmxAPI.parseUri(url);
		if (u.host == "")
			return "";
		var s = u.host + u.directory;
		if (s.charAt(s.length - 1) == "/")
			s = s.substring(0, s.length - 1);
		return s;
	},
	getAPIFolderRoot: memoize(function()
	{
		return gmxAPI.getScriptBase("api.js");
	})
	,
	getAPIHost: memoize(function()
	{
		var apiHost = gmxAPI.getHostAndPath(gmxAPI.getAPIFolderRoot());
		return /(.*)\/[^\/]*/.exec((apiHost != "") ? apiHost : gmxAPI.getHostAndPath(window.location.href))[1]; //удаляем последний каталог в адресе
	})
	,
	getAPIHostRoot: memoize(function()
	{
		return "http://" + gmxAPI.getAPIHost() + "/";
	})
	,
	isArray: function(obj)
	{
		return Object.prototype.toString.apply(obj) === '[object Array]';
	}
	,
	valueInArray: function(arr, value)
	{
		for (var i = 0; i < arr.length; i++)
			if (arr[i] == value)
				return true;
		
		return false;
	}
	,
	arrayToHash: function(arr)
	{
		var ret = {};
		for (var i = 0; i < arr.length; i++)
			ret[arr[i][0]] = arr[i][1];
		return ret;
	}
	,
	lastFlashMapId: 0
	,
	newFlashMapId: function()
	{
		this.lastFlashMapId += 1;
		return "random_" + this.lastFlashMapId;
	}
	,
	uniqueGlobalName: function(thing)
	{
		var id = this.newFlashMapId();
		window[id] = thing;
		return id;
	}
	,
	loadVariableFromScript: function(url, name, callback, onError, useTimeout)
	{
		window[name] = undefined;
		var script = document.createElement("script");
		var done = false;
		
		script.onerror = function()
		{
			if (!done)
			{
				clearInterval(intervalError);
				if (onError) onError();
				done = true;
			}
		}
		
		script.onload = function()
		{
			if (!done)
			{
				clearInterval(intervalError);
				if ( window[name] !== undefined )
					callback(window[name]);
				else if (onError) onError();
				done = true;
			}
		}
		
		script.onreadystatechange = function()
		{
			if (!done)
			{
				if ( this.readyState === 'loaded' )
				{
					clearInterval(intervalError);
					if ( window[name] !== undefined )
						callback(window[name]);
					else if (onError) onError();
					done = true;
				}
			}
		}
		
		var intervalError = setInterval(function()
		{
			if (!done)
			{
				if (script.readyState === 'loaded')
				{
					clearInterval(intervalError);
					if (typeof window[name] === 'undefined')
					{
						if (onError) onError();
					}
					done = true;
				}
			}
		}, 50);
		
		script.setAttribute("charset", "UTF-8");
		document.getElementsByTagName("head").item(0).appendChild(script);
		script.setAttribute("src", url);
	}
}

window.gmxAPI.lambertCoefX = 100*gmxAPI.distVincenty(0, 0, 0.01, 0);
window.gmxAPI.lambertCoefY = 100*gmxAPI.distVincenty(0, 0, 0, 0.01)*180/Math.PI;
window.gmxAPI.serverBase = 'maps.kosmosnimki.ru';		// HostName основной карты по умолчанию

	(function()
	{
		// Begin: Блок общих методов не доступных из вне
		var stateListeners = {};	// Глобальные события
		
		function getArr(eventName, obj)
		{
			var arr = (obj ? 
				('stateListeners' in obj && eventName in obj.stateListeners ? obj.stateListeners[eventName] : [])
				: ( eventName in stateListeners ? stateListeners[eventName] : [])
			);
			return arr;
		}
		// Обработка пользовательских Listeners на obj
		function chkListeners(eventName, obj, attr)
		{
			var out = true;
			var arr = getArr(eventName, obj);
			for (var i=0; i<arr.length; i++)
			{
				out = arr[i].func(attr);
			}
			return out;
		}

		/** Пользовательские Listeners изменений состояния карты
		* @function addMapStateListener
		* @memberOf api - добавление прослушивателя
		* @param {eventName} название события
		* @param {func} вызываемый метод
		* @return {id} присвоенный id прослушивателя
		* @see <a href="http://mapstest.kosmosnimki.ru/api/ex_locationTitleDiv.html">» Пример использования</a>.
		* @author <a href="mailto:saleks@scanex.ru">Sergey Alexseev</a>
		*/
		function addMapStateListener(obj, eventName, func)
		{
			var arr = getArr(eventName, obj);
			var id = gmxAPI.newFlashMapId();
			arr.push({"id": id, "func": func });
			if(obj) obj.stateListeners[eventName] = arr;
			else stateListeners[eventName] = arr;
			return id;
		}

		/** Пользовательские Listeners изменений состояния карты
		* @function removeMapStateListener
		* @memberOf api - удаление прослушивателя
		* @param {eventName} название события
		* @param {id} вызываемый метод
		* @return {Bool} true - удален false - не найден
		* @see <a href="http://mapstest.kosmosnimki.ru/api/ex_locationTitleDiv.html">» Пример использования</a>.
		* @author <a href="mailto:saleks@scanex.ru">Sergey Alexseev</a>
		*/
		function removeMapStateListener(obj, eventName, id)
		{
			var arr = getArr(eventName, obj);
			var out = [];
			for (var i=0; i<arr.length; i++)
			{
				if(id != arr[i]["id"]) out.push(arr [i]);
			}
			if(obj) obj.stateListeners[eventName] = out;
			else stateListeners[eventName] = out;
			return true;
		}
		gmxAPI._listeners = {
			'chkListeners': chkListeners,
			'addMapStateListener': addMapStateListener,
			'removeMapStateListener': removeMapStateListener
		};
		// End: Блок общих методов не доступных из вне
	})();

})();
// Блок методов глобальной области видимости
var kosmosnimki_API = "1D30C72D02914C5FB90D1D448159CAB6";		// ID базовой карты подложек
var tmp = [
	'isIE', 'parseCoordinates', 'setBg', 'deselect', 'compatEvent', 'compatTarget', 'eventX', 'eventY', 'getOffsetLeft', 'getOffsetTop',
	'newStyledDiv', 'show', 'hide', 'setPositionStyle', 'position', 'bottomPosition', 'size',
	'makeImageButton', 'setVisible', 'getTextContent', 'parseXML',
	'getScriptURL', 'getScriptBase', 'getHostAndPath', 'getBaseMapParam', 'strip', 'parseUri', 'parseColor',
	'forEachPoint',
	'merc_geometry', 'from_merc_geometry', 'getBounds', 'isRectangle', 'getScale', 'geoLength', 'geoArea', 'geoCenter',
	'parseGML', 'createGML', 'merc_x', 'from_merc_x', 'merc_y', 'from_merc_y',
	'distVincenty', 'KOSMOSNIMKI_LOCALIZED',
	'prettifyDistance', 'prettifyArea',
	'pad2', 'formatCoordinates', 'formatCoordinates2',
	'lastFlashMapId', 'newFlashMapId', 'uniqueGlobalName', 'loadVariableFromScript',
	// Не используемые в api.js
	'newDiv', 'newSpan', 'positionSize', 'merc', 'from_merc', 'formatDegrees', 'memoize', 
	'DegToRad', 'RadToDeg', 'ArcLengthOfMeridian', 'UTMCentralMeridian', 'FootpointLatitude', 'MapLatLonToXY', 'MapXYToLatLon',
	'LatLonToUTMXY', 'UTMXYToLatLon', 'trunc', 'truncate9', 'lambertCoefX', 'lambertCoefY', 'fragmentArea', 'fragmentAreaMercator', 'formatDegreesSimple',
	'convertCoords', 'transformGeometry', 'boundsIntersect', 'getTagValue', 
	'forEachPointAmb', 'deg_rad', 'deg_decimal'
];
for (var i=0; i<tmp.length; i++) window[tmp[i]] = gmxAPI[tmp[i]];

function newElement(tagName, props, style) { return gmxAPI.newElement(tagName, props, style, true); }
var getAPIFolderRoot = gmxAPI.memoize(function() { return gmxAPI.getAPIFolderRoot(); });
var getAPIHost = gmxAPI.memoize(function() { return gmxAPI.getAPIHost(); });
var getAPIHostRoot = gmxAPI.memoize(function() { return gmxAPI.getAPIHostRoot(); });

////
var flashMapAlreadyLoading = false;

function HandlerMode(div, event, handler)
{
	this.div = div;
	this.event = event;
	this.handler = handler;
}

HandlerMode.prototype.set = function()   
{
	if(this.div.attachEvent) this.div.attachEvent("on"+this.event, this.handler); 
	if(this.div.addEventListener) this.div.addEventListener(this.event, this.handler, false);
}

HandlerMode.prototype.clear = function() 
{
	if(this.div.detachEvent) this.div.detachEvent("on"+this.event, this.handler); 
	if(this.div.removeEventListener) this.div.removeEventListener(this.event, this.handler, false);
}

function GlobalHandlerMode(event, handler)
{
	return new HandlerMode(document.documentElement, event, handler);
}

function sendCrossDomainJSONRequest(url, callback, callbackParamName)
{
    callbackParamName = callbackParamName || 'CallbackName';
    
	var script = document.createElement("script");
	script.setAttribute("charset", "UTF-8");
	var callbackName = gmxAPI.uniqueGlobalName(function(obj)
	{
		callback && callback(obj);
		window[callbackName] = false;
		document.getElementsByTagName("head").item(0).removeChild(script);
	});
    
    var sepSym = url.indexOf('?') == -1 ? '?' : '&';
    
	script.setAttribute("src", url + sepSym + callbackParamName + "=" + callbackName + "&" + Math.random());
	document.getElementsByTagName("head").item(0).appendChild(script);
}

function isRequiredAPIKey( hostName )
{
	if ( hostName.indexOf("maps.kosmosnimki.ru") != -1 ) 
		return true;
		
	if (!window.apikeySendHosts) return false;
	
	for (var k = 0; k < window.apikeySendHosts.length; k++)
	{
		if (hostName.indexOf(window.apikeySendHosts[k]) != -1)
			return true;
	}
			
	return false;
}

function forEachLayer(layers, callback)
{
	var forEachLayerRec = function(o, isVisible)
	{
		isVisible = isVisible && o.content.properties.visible;
		if (o.type == "layer")
			callback(o.content, isVisible);
		else if (o.type == "group")
		{
			var a = o.content.children;
			for (var k = a.length - 1; k >= 0; k--)
				forEachLayerRec(a[k], isVisible);
		}
	}
	forEachLayerRec({type: "group", content: { children: layers.children, properties: { visible: true } } }, true);
}

var APIKeyResponseCache = {};
var sessionKeyCache = {};
var KOSMOSNIMKI_SESSION_KEY = false;
var alertedAboutAPIKey = false;

function loadMapJSON(hostName, mapName, callback, onError)
{
	if (hostName.indexOf("http://") == 0)
		hostName = hostName.slice(7);
	if (hostName.charAt(hostName.length-1) == '/')
		hostName = hostName.slice(0, -1);
		
	//относительный путь в загружаемой карте
	if (hostName.charAt(0) == '/')
		hostName = getAPIHost() + hostName;
	
	if (flashMapAlreadyLoading)
	{
		setTimeout(function() { loadMapJSON(hostName, mapName, callback, onError); }, 200);
		return;
	}

	var alertAboutAPIKey = function(message)
	{
		if (!alertedAboutAPIKey)
		{
			alert(message);
			alertedAboutAPIKey = true;
		}
	}

	flashMapAlreadyLoading = true;

	var finish = function()
	{
		var key = window.KOSMOSNIMKI_SESSION_KEY;
		if (key == "INVALID")
			key = false;

		gmxAPI.loadVariableFromScript(
			"http://" + hostName + "/TileSender.ashx?ModeKey=map&MapName=" + mapName + (key ? ("&key=" + encodeURIComponent(key)) : "") + "&" + Math.random(),
			"getLayers",
			function(f)
			{
				var layers = f();
				if (layers)
				{
					layers.properties.hostName = hostName;
					window.sessionKeyCache[mapName] = layers.properties.MapSessionKey;
					forEachLayer(layers, function(layer)
					{ 
						layer.properties.mapName = layers.properties.name;
						layer.properties.hostName = hostName;
						layer.geometry = gmxAPI.from_merc_geometry(layer.geometry);
					});
				}
				callback(layers);
				flashMapAlreadyLoading = false;
			},
			function()
			{
				flashMapAlreadyLoading = false;
				if (onError)
					onError();
			},
			onError ? true : false
		);
	}

	if ( isRequiredAPIKey( hostName ) )
	{
		var haveNoAPIKey = function()
		{
			alertAboutAPIKey(gmxAPI.KOSMOSNIMKI_LOCALIZED("Не указан API-ключ!", "API key not specified!"));
			window.KOSMOSNIMKI_SESSION_KEY = "INVALID";
			finish();
		}

		var useAPIKey = function(key)
		{
			var processResponse = function(response)
			{
				if (response.Result.Status)
					window.KOSMOSNIMKI_SESSION_KEY = response.Result.Key;
				else
					alertAboutAPIKey(gmxAPI.KOSMOSNIMKI_LOCALIZED("Указан неверный API-ключ!", "Incorrect API key specified!"));
				finish();
			}
			if (APIKeyResponseCache[key])
				processResponse(APIKeyResponseCache[key]);
			else
			{
				var apikeyRequestHost = window.apikeyRequestHost  ? window.apikeyRequestHost  : "maps.kosmosnimki.ru";
				sendCrossDomainJSONRequest(
					"http://" + apikeyRequestHost + "/ApiKey.ashx?WrapStyle=func&Key=" + key,
					function(response)
					{
						APIKeyResponseCache[key] = response;
						processResponse(response);
					}
				);
			}
		}
		var apiHost = gmxAPI.parseUri(getAPIFolderRoot()).hostOnly;
		if (apiHost == "") 
			apiHost = gmxAPI.parseUri(window.location.href).hostOnly;
		var apiKeyResult = (/key=([a-zA-Z0-9]+)/).exec(gmxAPI.getScriptURL("api.js"));

		if ((apiHost == "localhost") || apiHost.match(/127\.\d+\.\d+\.\d+/))
			useAPIKey("localhost");
		else if (apiKeyResult)
			useAPIKey(apiKeyResult[1]);
		else if (window.apiKey)
			useAPIKey(window.apiKey);
		else if (!gmxAPI.getScriptURL("config.js"))
			gmxAPI.loadVariableFromScript(
				gmxAPI.getScriptBase("api.js") + "config.js",
				"apiKey",
				function(key)
				{
					if (key)
						useAPIKey(key);
					else
						haveNoAPIKey();			// Нет apiKey в config.js
				}
				,
				function() { haveNoAPIKey(); }	// Нет config.js
			);
		else
			haveNoAPIKey();
	}
	else
		finish();
}

function createFlashMap(div, arg1, arg2, arg3)
{
	// версия FlashPlayer
	if (gmxAPI._flashDeconcept.SWFObjectUtil.getPlayerVersion().major < 10)
		return false;	

	if (!arg2 && !arg3)
		createKosmosnimkiMapInternal(div, false, arg1);
	else
	{
		var hostName, mapName, callback;
		if (arg3)
		{
			hostName = arg1;
			mapName = arg2;
			callback = arg3;
		}
		else
		{
			hostName = getAPIHost();
			mapName = arg1;
			callback = arg2;
		}

		var uri = gmxAPI.parseUri(hostName);
		if(uri.host) gmxAPI.serverBase = uri.host;						// HostName основной карты переопределен
		loadMapJSON(hostName, mapName, function(layers)
		{
			if (layers != null)
				(layers.properties.UseKosmosnimkiAPI ? createKosmosnimkiMapInternal : createFlashMapInternal)(div, layers, callback);
			else
				callback(null);
		});
	}
	return true;
}

var createKosmosnimkiMap = createFlashMap;
var makeFlashMap = createFlashMap;

(function(){
var flashId = gmxAPI.newFlashMapId();
var FlashMapObject = function(objectId_, properties_, parent_)
{
	this.objectId = objectId_;
	for (var key in properties_)
		if (properties_[key] == "null")
			properties_[key] = "";
	this.properties = properties_;
	this.parent = parent_;
	this.flashId = flashId;
	this.stateListeners = {};	// Пользовательские события
}
// расширение FlashMapObject
gmxAPI.extendFMO = function(name, func) {	FlashMapObject.prototype[name] = func;	}

function createFlashMapInternal(div, layers, callback)
{
	if(layers.properties.name == kosmosnimki_API) {
		if (layers.properties.OnLoad)		//  Обработка маплета базовой карты
		{
			try { eval("_kosmosnimki_temp=(" + layers.properties.OnLoad + ")")(); }
			catch (e) {
				gmxAPI.addDebugWarnings({'func': 'createKosmosnimkiMapInternal', 'handler': 'OnLoad', 'event': e, 'alert': 'Error in "'+layers.properties.title+'" mapplet: ' + e});
			}
		}
	}

	gmxAPI._div = div;	// DOM элемент - контейнер карты
	if (div.style.position != "absolute")
		div.style.position = "relative";

	history.navigationMode = 'compatible';
	var body = document.getElementsByTagName("body").item(0);
	if (body && !body.onunload)
		body.onunload = function() {};
	if (!window.onunload)
		window.onunload = function() {};

	var apiBase = getAPIFolderRoot();

	var focusLink = document.createElement("a");

	gmxAPI._chkListeners = gmxAPI._listeners.chkListeners;
	addMapStateListener = gmxAPI._listeners.addMapStateListener;
	removeMapStateListener = gmxAPI._listeners.removeMapStateListener;

	var loadCallback = function(rootObjectId)
	{ 
		if (!window.__flash__toXML)
		{
			setTimeout(function() { loadCallback(rootObjectId); }, 100);
			return;
		}

		try {

			var flashDiv = document.getElementById(flashId);
			gmxAPI.flashDiv = flashDiv;
			flashDiv.style.MozUserSelect = "none";
			
			FlashMapObject.prototype.setTileCaching = function(flag) { gmxAPI._cmdProxy('setTileCaching', { 'obj': this, 'attr':{'flag':flag} }); }
			FlashMapObject.prototype.setDisplacement = function(dx, dy) { gmxAPI._cmdProxy('setDisplacement', { 'obj': this, 'attr':{'dx':dx, 'dy':dy} }); }
			FlashMapObject.prototype.setBackgroundTiles = function(imageUrlFunction, projectionCode, minZoom, maxZoom, minZoomView, maxZoomView) { gmxAPI._cmdProxy('setBackgroundTiles', { 'obj': this, 'attr':{'func':gmxAPI.uniqueGlobalName(imageUrlFunction), 'projectionCode':projectionCode, 'minZoom':minZoom, 'maxZoom':maxZoom, 'minZoomView':minZoomView, 'maxZoomView':maxZoomView} }); }
			FlashMapObject.prototype.bringToTop = function() { return gmxAPI._cmdProxy('bringToTop', { 'obj': this }); }
			FlashMapObject.prototype.bringToBottom = function() { gmxAPI._cmdProxy('bringToBottom', { 'obj': this }); }
			FlashMapObject.prototype.bringToDepth = function(n) { return gmxAPI._cmdProxy('bringToDepth', { 'obj': this, 'attr':{'zIndex':n} }); }
			FlashMapObject.prototype.setDepth = FlashMapObject.prototype.bringToDepth;
			FlashMapObject.prototype.setActive = function(flag) { gmxAPI._cmdProxy('setActive', { 'obj': this, 'attr':{'flag':flag} }); }
			FlashMapObject.prototype.setEditable = function() { gmxAPI._cmdProxy('setEditable', { 'obj': this }); }
			FlashMapObject.prototype.startDrawing = function(type) { gmxAPI._cmdProxy('startDrawing', { 'obj': this, 'attr':{'type':type} }); }
			FlashMapObject.prototype.stopDrawing = function(type) { gmxAPI._cmdProxy('stopDrawing', { 'obj': this }); }
			FlashMapObject.prototype.isDrawing = function() { return gmxAPI._cmdProxy('isDrawing', { 'obj': this }); }
			FlashMapObject.prototype.getIntermediateLength = function() { return gmxAPI._cmdProxy('getIntermediateLength', { 'obj': this }); }
			FlashMapObject.prototype.getCurrentEdgeLength = function() { return gmxAPI._cmdProxy('getCurrentEdgeLength', { 'obj': this }); }
			FlashMapObject.prototype.setLabel = function(label) { gmxAPI._cmdProxy('setLabel', { 'obj': this, 'attr':{'label':label} }); }

			FlashMapObject.prototype.positionWindow = function(x1, y1, x2, y2) { gmxAPI._cmdProxy('positionWindow', { 'obj': this, 'attr':{'x1':x1, 'y1':y1, 'x2':x2, 'y2':y2} }); }
			FlashMapObject.prototype.setStyle = function(style, activeStyle) { gmxAPI._cmdProxy('setStyle', { 'obj': this, 'attr':{'regularStyle':style, 'hoveredStyle':activeStyle} }); }
			FlashMapObject.prototype.getStyle = function( removeDefaults ) { var flag = (typeof removeDefaults == 'undefined' ? false : removeDefaults); return gmxAPI._cmdProxy('getStyle', { 'obj': this, 'attr':flag }); }
			FlashMapObject.prototype.getVisibleStyle = function() { return gmxAPI._cmdProxy('getVisibleStyle', { 'obj': this }); }

			FlashMapObject.prototype.getVisibility = function() { return gmxAPI._cmdProxy('getVisibility', { 'obj': this }); }
			FlashMapObject.prototype.setVisible = function(flag) {
				gmxAPI._cmdProxy('setVisible', { 'obj': this, 'attr': flag });
				var val = (flag ? true : false);
				var prev = this.isVisible;
				this.isVisible = val;
				if(prev != val) gmxAPI._listeners.chkListeners('onChangeVisible', this, val);	// Вызов Listeners события 'onChangeVisible'
			}
			FlashMapObject.prototype.getDepth = function(attr) { return gmxAPI._cmdProxy('getDepth', { 'obj': this }); }
			FlashMapObject.prototype.getZoomBounds = function() { return gmxAPI._cmdProxy('getZoomBounds', { 'obj': this }); }
			FlashMapObject.prototype.setZoomBounds = function(minZoom, maxZoom) { return gmxAPI._cmdProxy('setZoomBounds', { 'obj': this, 'attr':{'minZ':minZoom, 'maxZ':maxZoom} }); }
			FlashMapObject.prototype.sendPNG = function(attr) { var ret = gmxAPI._cmdProxy('sendPNG', { 'attr': attr }); return ret; }
			FlashMapObject.prototype.savePNG = function(fileName) { gmxAPI._cmdProxy('savePNG', { 'attr': fileName }); }
			FlashMapObject.prototype.trace = function(val) { gmxAPI._cmdProxy('trace', { 'attr': val }); }
			FlashMapObject.prototype.setQuality = function(val) { gmxAPI._cmdProxy('setQuality', { 'attr': val }); }
			FlashMapObject.prototype.disableCaching = function() { gmxAPI._cmdProxy('disableCaching', {}); }
			FlashMapObject.prototype.print = function() { gmxAPI._cmdProxy('print', {}); }
			FlashMapObject.prototype.repaint = function() { gmxAPI._cmdProxy('repaint', {}); }
			FlashMapObject.prototype.moveTo = function(x, y, z) { gmxAPI._cmdProxy('moveTo', { 'attr': {'x':gmxAPI.merc_x(x), 'y':gmxAPI.merc_y(y), 'z':17 - z} }); }
			FlashMapObject.prototype.slideTo = function(x, y, z) { gmxAPI._cmdProxy('slideTo', { 'attr': {'x':gmxAPI.merc_x(x), 'y':gmxAPI.merc_y(y), 'z':17 - z} }); }
			FlashMapObject.prototype.freeze = function() { gmxAPI._cmdProxy('freeze', {}); }
			FlashMapObject.prototype.unfreeze = function() { gmxAPI._cmdProxy('unfreeze', {}); }
			FlashMapObject.prototype.setCursor = function(url, dx, dy) { gmxAPI._cmdProxy('setCursor', { 'attr': {'url':url, 'dx':dx, 'dy':dy} }); }
			FlashMapObject.prototype.clearCursor = function() { gmxAPI._cmdProxy('clearCursor', {}); }

			FlashMapObject.prototype.moveToCoordinates = function(text, z)
			{
				var me = this;
				return gmxAPI.parseCoordinates(text, function(x, y)
				{
					me.moveTo(x, y, z ? z : me.getZ());
				});
			}
			FlashMapObject.prototype.getBestZ = function(minX, minY, maxX, maxY)
			{
				if ((minX == maxX) && (minY == maxY))
					return 17;
				return Math.max(0, 17 - Math.ceil(Math.log(Math.max(
					Math.abs(gmxAPI.merc_x(maxX) - gmxAPI.merc_x(minX))/flashDiv.clientWidth,
					Math.abs(gmxAPI.merc_y(maxY) - gmxAPI.merc_y(minY))/flashDiv.clientHeight
				))/Math.log(2)));
			}
			FlashMapObject.prototype.zoomToExtent = function(minx, miny, maxx, maxy)
			{
				this.moveTo(
					gmxAPI.from_merc_x((gmxAPI.merc_x(minx) + gmxAPI.merc_x(maxx))/2),
					gmxAPI.from_merc_y((gmxAPI.merc_y(miny) + gmxAPI.merc_y(maxy))/2),
					this.getBestZ(minx, miny, maxx, maxy)
				);
			}
			FlashMapObject.prototype.slideToExtent = function(minx, miny, maxx, maxy)
			{
				this.slideTo(
					gmxAPI.from_merc_x((gmxAPI.merc_x(minx) + gmxAPI.merc_x(maxx))/2),
					gmxAPI.from_merc_y((gmxAPI.merc_y(miny) + gmxAPI.merc_y(maxy))/2),
					this.getBestZ(minx, miny, maxx, maxy)
				);
			}

			var propertiesFromArray = function(a)
			{
				a.sort(function(e1, e2)
				{
					var f1 = e1[0], f2 = e2[0];
					return (f1 < f2) ? -1 : (f1 == f2) ? 0 : 1;
				});
				var p_ = {};
				for (var i = 0; i < a.length; i++)
					p_[a[i][0]] = a[i][1];
				return p_;
			}

			FlashMapObject.prototype.getChildren = function()
			{
				var arr = gmxAPI._cmdProxy('getChildren', { 'obj': this });
				var ret = [];
				for (var i = 0; i < arr.length; i++)
					ret.push(new FlashMapObject(arr[i].id, propertiesFromArray(arr[i].properties), this));
				return ret;
			}

			FlashMapObject.prototype.setHandler = function(eventName, handler)
			{
				var me = this;
				gmxAPI._cmdProxy('setHandler', { 'obj': this, 'attr': {
					'eventName':eventName
					,'callbackName':handler ? gmxAPI.uniqueGlobalName(function(subObjectId, a, attr)
						{
							handler(new FlashMapObject(subObjectId, propertiesFromArray(a), me), attr);
						}) : null
					}
				});
			}
			FlashMapObject.prototype.removeHandler = function(eventName)
			{
				gmxAPI._cmdProxy('removeHandler', { 'obj': this, 'attr':{ 'eventName':eventName }});
			}

			FlashMapObject.prototype.setHandlers = function(handlers)
			{
				for (var key in handlers)
					this.setHandler(key, handlers[key]);
			}

			/** Добавление объектов из SWF файла
			* @function
			* @memberOf api
			* @param {String} url SWF файла содержащего массив добавляемых обьектов
			* @see api.FlashMapObject#addObjects
			* @see <a href="http://kosmosnimki.ru/geomixer/docs/api_samples/ex_static_multi.html">» Пример использования</a>.
			* @author <a href="mailto:saleks@scanex.ru">Sergey Alexseev</a>
			*/
			FlashMapObject.prototype.addObjectsFromSWF = function(url) {
				gmxAPI._cmdProxy('addObjectsFromSWF', {'obj': this, 'attr':{'url':url}}); // Отправить команду в SWF
			}
			/** Добавление набора статических объектов на карту
			* @function
			* @memberOf api
			* @param {array} data массив добавляемых обьектов
			* @return {array} массив добавленных обьектов
			* @see api.FlashMapObject#addObject
			* @see <a href="http://kosmosnimki.ru/geomixer/docs/api_samples/ex_static_multi.html">» Пример использования</a>.
			* @author <a href="mailto:saleks@scanex.ru">Sergey Alexseev</a>
			*/
			FlashMapObject.prototype.addObjects = function(data) {
				var out = [];
				for (var i=0; i<data.length; i++)	// Подготовка массива обьектов
				{
					var ph = data[i];
					var props = ph['properties'] || null;
					var tmp = {
						"parentId": this.objectId,
						"geometry": gmxAPI.merc_geometry(ph['geometry']),
						"properties": props
					};
					if(ph['setStyle']) tmp['setStyle'] = ph['setStyle'];
					if(ph['setLabel']) tmp['setLabel'] = ph['setLabel'];
					out.push(tmp);
				}
				var _obj = gmxAPI._cmdProxy('addObjects', {'attr':out}); // Отправить команду в SWF

				out = [];
				for (var i=0; i<_obj.length; i++)	// Отражение обьектов в JS
				{
					out.push(new FlashMapObject(_obj[i], data[i].properties, this));
				}
				return out;
			}
			FlashMapObject.prototype.addObject = function(geometry, props) {
				var geo = gmxAPI.merc_geometry(geometry);
				var obj = gmxAPI._cmdProxy('addObject', { 'obj': this, 'attr':{ 'geometry':geo, 'properties':props }});
				if(!obj) obj = false;
				return new FlashMapObject(obj, props, this);
			}
			FlashMapObject.prototype.setFilter = function(sql) {
				if(!this.clusters && '_Clusters' in gmxAPI) {
					this.clusters = new gmxAPI._Clusters(this);	// атрибуты кластеризации потомков по фильтру
				}
				if(!sql) sql ='';
				this._sql = sql;			// атрибуты фильтра установленные юзером
				var ret = gmxAPI._cmdProxy('setFilter', { 'obj': this, 'attr':{ 'sql':sql }});
				return ret;
			}

			removeFromMapLayers = function(lid)	// удалить слой из map.layers 
			{
				for(var i=0; i<map.layers.length; i++) {			// Удаление слоя из массива
					if(map.layers[i].properties.LayerID === lid) {
						map.layers.splice(i, 1);
						break;
					}
				}
				for(key in map.layers) {							// Удаление слоя из хэша
					if(map.layers[key].properties.LayerID === lid) {
						delete map.layers[key];
					}
				}
			}

			FlashMapObject.prototype.remove = function()
			{
				if (this.copyright) 
					map.removeCopyrightedObject(this);
					
				if(this.objectId) gmxAPI._cmdProxy('remove', { 'obj': this}); // Удалять в SWF только если там есть обьект
				if(this.properties && this.properties.LayerID) removeFromMapLayers(this.properties.LayerID);
			}
			FlashMapObject.prototype.setGeometry = function(geometry) {
				var geom =  gmxAPI.merc_geometry(geometry);
				gmxAPI._cmdProxy('setGeometry', { 'obj': this, 'attr':geom });
			}
			FlashMapObject.prototype.getGeometry = function() 
			{ 
				var geom = gmxAPI._cmdProxy('getGeometry', { 'obj': this });
				var out = { "type": geom.type };
				var coords =  gmxAPI.forEachPoint(geom.coordinates, function(c) {
						return [gmxAPI.from_merc_x(c[0]), gmxAPI.from_merc_y(c[1])];
						}
					);
				out["coordinates"] = coords;
				return out;
			}
			FlashMapObject.prototype.getLength = function(arg1, arg2, arg3, arg4)
			{
				var out = 0;
				if(arg1) out = gmxAPI.geoLength(arg1, arg2, arg3, arg4);
				else out = gmxAPI._cmdProxy('getLength', { 'obj': this });
				return out;
			}
			FlashMapObject.prototype.getArea = function(arg)
			{
				var out = 0;
				if(arg) out = gmxAPI.geoArea(arg);
				else out = gmxAPI._cmdProxy('getArea', { 'obj': this });
				return out;
			}
			FlashMapObject.prototype.getCenter = function(arg1, arg2, arg3, arg4)
			{
				var out = 0;
				if(arg1) out = gmxAPI.geoCenter(arg1, arg2, arg3, arg4);
				else out = gmxAPI._cmdProxy('getCenter', { 'obj': this });
				return out;
			}
			FlashMapObject.prototype.getGeometryType = function()
			{
				return gmxAPI._cmdProxy('getGeometryType', { 'obj': this });
			}
			FlashMapObject.prototype.setPoint = function(x, y) { this.setGeometry({ type: "POINT", coordinates: [x, y] }); }
			FlashMapObject.prototype.setLine = function(coords) { this.setGeometry({ type: "LINESTRING", coordinates: coords }); }
			FlashMapObject.prototype.setPolygon = function(coords) { this.setGeometry({ type: "POLYGON", coordinates: [coords] }); }
			FlashMapObject.prototype.setRectangle = function(x1, y1, x2, y2) { this.setPolygon([[x1, y1], [x1, y2], [x2, y2], [x2, y1]]); }
			FlashMapObject.prototype.setCircle = function(x, y, r)
			{
				function v_fi (fi, a, b)
				{
					return [
						-Math.cos(fi)*Math.sin(a)+Math.sin(fi)*Math.sin(b)*Math.cos(a),
						Math.cos(fi)*Math.cos(a)+Math.sin(fi)*Math.sin(b)*Math.sin(a),
						-Math.sin(fi)*Math.cos(b)
					];
				}

				var n = 100;            //кол-во точек
				var a = Math.PI*x/180;  //долгота центра окружности в радианах
				var b = Math.PI*y/180;  //широта центра окружности в радианах

				var R = 6372795; // Радиус Земли
				//      6378137 - Некоторые источники дают такое число.

				var d = R * Math.sin(r / R);
				var Rd = R * Math.cos(r / R);
				var VR = [];
				VR[0] = Rd * Math.cos(b) * Math.cos(a);
				VR[1] = Rd * Math.cos(b) * Math.sin(a);
				VR[2] = Rd * Math.sin(b);

				var circle = [];
				var coordinates = [];

				for (var fi = 0; fi < 2*Math.PI + 0.000001; fi += (2*Math.PI/n))
				{
					var v = v_fi(fi, a, b);
					for (var i=0; i<3; i++)
						circle[i] = VR[i] + d*v[i];

					var t1 = (180*Math.asin(circle[2]/R)/Math.PI);
					var r = Math.sqrt(circle[0]*circle[0]+circle[1]*circle[1]);
					var t2 = circle[1]<0 ? -180*Math.acos(circle[0]/r)/Math.PI :
						180*Math.acos(circle[0]/r)/Math.PI;

					if (t2 < x - 180)
						t2 += 360;
					else if (t2 > x + 180)
						t2 -= 360;

					coordinates.push([t2, t1]);
				}

				this.setPolygon(coordinates);
			}
			FlashMapObject.prototype.clearBackgroundImage = function() { gmxAPI._cmdProxy('clearBackgroundImage', { 'obj': this}); }
			FlashMapObject.prototype.setImageExtent = function(attr)
			{
				this.setStyle({ fill: { color: 0x000000, opacity: 100 } });
				if (attr.notSetPolygon)
				{
					this.setPolygon([
						[attr.extent.minX, attr.extent.maxY],
						[attr.extent.maxX, attr.extent.maxY],
						[attr.extent.maxX, attr.extent.minY],
						[attr.extent.minX, attr.extent.minY],
						[attr.extent.minX, attr.extent.maxY]
					]);
				}
				gmxAPI._cmdProxy('setImageExtent', { 'obj': this, 'attr':attr});
			}
			FlashMapObject.prototype.setImage = function(url, x1, y1, x2, y2, x3, y3, x4, y4, tx1, ty1, tx2, ty2, tx3, ty3, tx4, ty4)
			{
				this.setStyle({ fill: { color: 0x000000, opacity: 100 } });
				var attr = {};
				if (tx1) {
					attr = {
						'x1': gmxAPI.merc_x(tx1), 'y1': gmxAPI.merc_y(ty1), 'x2': gmxAPI.merc_x(tx2), 'y2': gmxAPI.merc_y(ty2), 'x3': gmxAPI.merc_x(tx3), 'y3': gmxAPI.merc_y(ty3), 'x4': gmxAPI.merc_x(tx4), 'y4': gmxAPI.merc_y(ty4)
						,'tx1': x1, 'ty1': y1, 'tx2': x2, 'ty2': y2, 'tx3': x3, 'ty3': y3, 'tx4': x4, 'ty4': y4
					};
				}
				else
				{
					this.setPolygon([[x1, y1], [x2, y2], [x3, y3], [x4, y4], [x1, y1]]);
					attr = {
						'x1': gmxAPI.merc_x(x1), 'y1': gmxAPI.merc_y(y1), 'x2': gmxAPI.merc_x(x2), 'y2': gmxAPI.merc_y(y2), 'x3': gmxAPI.merc_x(x3), 'y3': gmxAPI.merc_y(y3), 'x4': gmxAPI.merc_x(x4), 'y4': gmxAPI.merc_y(y4)
					};
				}
				attr['url'] = url;
				gmxAPI._cmdProxy('setImage', { 'obj': this, 'attr':attr});
			}
			FlashMapObject.prototype.setTiles = FlashMapObject.prototype.setBackgroundTiles;
			FlashMapObject.prototype.setVectorTiles = function(dataUrlFunction, cacheFieldName, dataTiles, filesHash) 
			{ 
				gmxAPI._cmdProxy('setVectorTiles', { 'obj': this, 'attr':{'tileFunction':gmxAPI.uniqueGlobalName(dataUrlFunction), 'cacheFieldName':cacheFieldName, 'filesHash':filesHash, 'dataTiles':dataTiles}});
			}
/* не используется
			FlashMapObject.prototype.loadJSON = function(url)
			{
				flashDiv.loadJSON(this.objectId, url);
			}
*/
			FlashMapObject.prototype.setCopyright = function(copyright)
			{
				this.copyright = copyright;
				map.addCopyrightedObject(this);
			}
			FlashMapObject.prototype.setBackgroundColor = function(color)
			{ 
				this.backgroundColor = color;
				gmxAPI._cmdProxy('setBackgroundColor', { 'obj': this, 'attr':color });
				if (this.objectId == map.objectId)
				{
					var isWhite = (0xff & (color >> 16)) > 80;
					var htmlColor = isWhite ? "black" : "white";
					coordinates.style.fontSize = "14px";
					coordinates.style.color = htmlColor;
					scaleBar.style.border = "1px solid " + htmlColor;
					scaleBar.style.fontSize = "11px";
					scaleBar.style.color = htmlColor;
					copyright.style.fontSize = "11px";
					copyright.style.color = htmlColor;
					changeCoords.src = apiBase + "img/" + (isWhite ? "coord_reload.png" : "coord_reload_orange.png");
				}
			}

			FlashMapObject.prototype.getGeometrySummary = function()
			{
				var out = '';
				var geom = this.getGeometry();
				var geomType = (geom ? geom.type : '');
				if(geom) {
					if (geomType.indexOf("POINT") != -1)
					{
						var c = geom.coordinates;
						out = "<b>" + gmxAPI.KOSMOSNIMKI_LOCALIZED("Координаты:", "Coordinates:") + "</b> ";
						out += gmxAPI.formatCoordinates(gmxAPI.merc_x(c[0]), gmxAPI.merc_y(c[1]));
					}
					else if (geomType.indexOf("LINESTRING") != -1) {
						out = "<b>" + gmxAPI.KOSMOSNIMKI_LOCALIZED("Длина:", "Length:") + "</b> ";
						out += gmxAPI.prettifyDistance(this.getLength());
					}
					else if (geomType.indexOf("POLYGON") != -1) {
						out = "<b>" + gmxAPI.KOSMOSNIMKI_LOCALIZED("Площадь:", "Area:") + "</b> ";
						var area = this.getArea();
						out += gmxAPI.prettifyArea(area);
					}
				}
				return out;
			}

			FlashMapObject.prototype.setToolImage = function(imageName, activeImageName)
			{
				this.setStyle(
					{ marker: { image: apiBase + "img/" + imageName } },
					activeImageName ? { marker: { image: apiBase + "img/" + activeImageName } } : null
				);
			}

			FlashMapObject.prototype.enableQuicklooks = function(callback)
			{
				var flag = true;

				if (this.shownQuicklooks)
					for (var url in this.shownQuicklooks)
						this.shownQuicklooks[url].remove();
				var shownQuicklooks = {};
				this.shownQuicklooks = shownQuicklooks;

				this.setHandler("onClick", function(o)
				{
					try {
					var identityField = gmxAPI.getIdentityField(o);
					var id = 'id_' + o.properties[identityField];
					if (!shownQuicklooks[id])
					{
						var url = callback(o);
						var d1 = 100000000;
						var d2 = 100000000;
						var d3 = 100000000;
						var d4 = 100000000;
						var x1, y1, x2, y2, x3, y3, x4, y4;
						var geom = o.getGeometry();
						var coord = geom.coordinates;
						gmxAPI.forEachPoint(coord, function(p)
						{
							var x = gmxAPI.merc_x(p[0]);
							var y = gmxAPI.merc_y(p[1]);
							if ((x - y) < d1)
							{
								d1 = x - y;
								x1 = p[0];
								y1 = p[1];
							}
							if ((-x - y) < d2)
							{
								d2 = -x - y;
								x2 = p[0];
								y2 = p[1];
							}
							if ((-x + y) < d3)
							{
								d3 = -x + y;
								x3 = p[0];
								y3 = p[1];
							}
							if ((x + y) < d4)
							{
								d4 = x + y;
								x4 = p[0];
								y4 = p[1];
							}
						});

						var q = o.addObject(null, o.properties);
						shownQuicklooks[id] = q;
						q.setStyle({ fill: { opacity: 100 } });
						q.setImage(url, x1, y1, x2, y2, x3, y3, x4, y4);
					}
					else
					{
						shownQuicklooks[id].remove();
						delete shownQuicklooks[id];
					}
					} catch (e) {
						gmxAPI.addDebugWarnings({'func': 'enableQuicklooks', 'handler': 'onClick', 'event': e, 'alert': e});
						//alert(e);
					}
					gmxAPI._listeners.chkListeners('clickBalloonFix', map, o);	// Проверка map Listeners на clickBalloonFix
				});
			}

			FlashMapObject.prototype.enableTiledQuicklooks = function(callback, minZoom, maxZoom)
			{
				this.enableTiledQuicklooksEx(function(o, image)
				{
					var path = callback(o);
					image.setTiles(function(i, j, z) 
					{
						if (path.indexOf("{") > 0){
							return path.replace(new RegExp("{x}", "gi"), i).replace(new RegExp("{y}", "gi"), j).replace(new RegExp("{z}", "gi"), z);
						}
						else{
							return path + z + "/" + i + "/" + z + "_" + i + "_" + j + ".jpg";
						}
					});
				}, minZoom, maxZoom);
			}

			FlashMapObject.prototype.enableTiledQuicklooksEx = function(callback, minZoom, maxZoom)
			{
				var images = {};
				if (this.tilesParent)
					this.tilesParent.remove();
				var tilesParent = this.addObject();
				this.tilesParent = tilesParent;
				tilesParent.setZoomBounds(minZoom, maxZoom ? maxZoom : 18);
				var propsArray = [];
				var flipCounts = {};
				var TemporalColumnName = this.properties.TemporalColumnName || '';
				tilesParent.clearItems  = function()
				{
					for(id in images) {
						images[id].remove();
					}
					images = {};
					propsArray = [];
					flipCounts = {};
				}
				var updateImageDepth = function(o)
				{
					var identityField = gmxAPI.getIdentityField(o);
					var id = 'id_' + o.properties[identityField];
					var props = o.properties;

					// Установка балуна для тайлов меньше Zoom растров
					var curZ = map.getZ();
					var flag = (minZoom && curZ < minZoom ? true : false);
					var mZ = (maxZoom ? maxZoom : 18);
					if(!flag && curZ > mZ) flag = true;
					if(flag) gmxAPI._listeners.chkListeners('clickBalloonFix', map, o);	// Проверка map Listeners на clickBalloonFix
					///// End

					if (!images[id]) {
						return;
					}
					var lastDate = (TemporalColumnName ? props[TemporalColumnName] : props.date || props.DATE);
					var lastFc = flipCounts[id];
					var n = 0;
					for (var i = 0; i < propsArray.length; i++)
					{
						var pa = propsArray[i];
						var date = (TemporalColumnName ? pa[TemporalColumnName] : pa.date || pa.DATE);
						var fc = flipCounts["id_" + pa[identityField]];
						var isHigher = false;
						if (!lastFc)
							isHigher = !fc ? (lastDate && (date > lastDate)) : (fc < 0);
						else if (lastFc > 0)
							isHigher = !fc || (fc < lastFc);
						else if (lastFc < 0)
							isHigher = fc && (fc < lastFc);

						if (!isHigher)
							n += 1;
					}
					images[id].bringToDepth(n - 1);
				}
				tilesParent.setZoomBounds(minZoom, maxZoom ? maxZoom : 18);
				tilesParent.observeVectorLayer(this, function(o, flag)
				{
					var identityField = gmxAPI.getIdentityField(o);
					var id = 'id_' + o.properties[identityField];
					if (flag && !images[id])
					{
						var image = tilesParent.addObject(o.geometry, o.properties);
						callback(o, image);
						images[id] = image;
						propsArray.push(o.properties);
						updateImageDepth(o);
					}
					else if (!flag && images[id])
					{
						images[id].remove();
						delete images[id];
						for (var i = 0; i < propsArray.length; i++)
						{
							if (propsArray[i][identityField] == o.properties[identityField])
							{
								propsArray.splice(i, 1);
								break;
							}
						}
					}
				});
				this.setHandler("onClick", function(o)
				{
					try {
						var identityField = gmxAPI.getIdentityField(o);
						var id = 'id_' + o.properties[identityField];
						flipCounts[id] = o.flip();
						updateImageDepth(o);
					} catch (e) {
						gmxAPI.addDebugWarnings({'func': 'enableTiledQuicklooksEx', 'handler': 'onClick', 'event': e, 'alert': e});
						//alert(e);
					}
				});
			}

			FlashMapObject.prototype.flip = function() { return gmxAPI._cmdProxy('flip', { 'obj': this }); }

			var FlashMapFeature = function(geometry, properties, layer)
			{
				this.geometry = geometry;
				this.properties = properties;
				this.layer = layer;
			}
			FlashMapFeature.prototype.getGeometry = function()
			{
				return this.geometry;
			}
			FlashMapFeature.prototype.getLength = function()
			{
				return gmxAPI.geoLength(this.geometry);
			}
			FlashMapFeature.prototype.getArea = function()
			{
				return gmxAPI.geoArea(this.geometry);
			}

			// получить minZoom maxZoom для слоя по фильтрам
			function getMinMaxZoom(prop)
			{
				var minZoom = 20, maxZoom = 0;
				for (var i = 0; i < prop.styles.length; i++)
				{
					var style = prop.styles[i];
					minZoom = Math.min(style.MinZoom, minZoom);
					maxZoom = Math.max(style.MaxZoom, maxZoom);
				}
				return {'minZoom': minZoom, 'maxZoom': maxZoom};
			}

			function reSetStyles(styles, obj)
			{
				for (var i = 0; i < styles.length; i++)
				{
					var style = styles[i];
					var givenStyle = {};
					if (typeof style.StyleJSON != 'undefined')
						givenStyle = style.StyleJSON;
					else if (typeof style.RenderStyle != 'undefined')
						givenStyle = style.RenderStyle;
					else
					{
						if (style.PointSize)
							givenStyle.marker = { size: parseInt(style.PointSize) };
						if (style.Icon)
						{
							var src = (style.Icon.indexOf("http://") != -1) ?
								style.Icon :
								(baseAddress + "/" + style.Icon);
							givenStyle.marker = { image: src, "center": true };
						}
						if (style.BorderColor || style.BorderWidth)
							givenStyle.outline = {
								color: gmxAPI.parseColor(style.BorderColor),
								thickness: parseInt(style.BorderWidth || "1"),
								opacity: (style.BorderWidth == "0" ? 0 : 100)
							};
						if (style.FillColor)
							givenStyle.fill = {
								color: gmxAPI.parseColor(style.FillColor),
								opacity: 100 - parseInt(style.Transparency || "0")
							};

						var label = style.label || style.Label;
						if (label)
						{
							givenStyle.label = {
								field: label.FieldName,
								color: gmxAPI.parseColor(label.FontColor),
								size: parseInt(label.FontSize || "12")
							};
						}
					}

					if (givenStyle.marker)
						givenStyle.marker.center = true;

					var hoveredStyle = JSON.parse(JSON.stringify(givenStyle));
					if (hoveredStyle.marker && hoveredStyle.marker.size)
						hoveredStyle.marker.size += 1;
					if (hoveredStyle.outline)
						hoveredStyle.outline.thickness += 1;

					var filter = obj.addObject();
					var filterSet = false;
					if (style.Filter)
					{
						if (/^\s*\[/.test(style.Filter))
						{
							var a = style.Filter.match(/^\s*\[([a-zA-Z0-9_]+)\]\s*([<>=]=?)\s*(.*)$/);
							if (a && (a.length == 4))
							{
								filter.setFilter(a[1] + " " + a[2] + " '" + a[3] + "'");
								filterSet = true;
							}
						}
						else
						{
							filter.setFilter(style.Filter);
							filterSet = true;
						}
					}
					if (!filterSet)
						filter.setFilter();
					filter.setZoomBounds(style.MinZoom, style.MaxZoom);
					filter.setStyle(givenStyle, hoveredStyle);
					
					var filterOld = obj.filters[i];
					gmxAPI._listeners.chkListeners('reSetStyles', map, {'filter': filter, 'style':style, 'filterOld':filterOld} );	// Проверка map Listeners на reSetStyles
					gmxAPI._listeners.chkListeners('reSetStyles', filterOld, {'filter': filter, 'style':style, 'filterOld':filterOld} );	// Проверка filterOld Listeners на reSetStyles
/*					
					if(filterOld && filterOld['clusters'] && 'setClusters' in filter) {	// Перенос атрибутов кластеризации в новый filter
						filter.setClusters(filterOld['clusters']['attr']);
					}
*/					
					//filter.properties = style;
					obj.filters[i] = filter;
				}
			}

			var maxRasterZoom = 1;
			var initialLayersAdded = false;
			FlashMapObject.prototype.addLayer = function(layer, isVisible)
			{
				if (!this.layers)
					this.layers = [];
				if (!this.layersParent)
					this.layersParent = this.addObject();
				if (!this.overlays)
				{
					this.overlays = this.addObject();
					this.addObject = function(geom, props)
					{
						var ret = FlashMapObject.prototype.addObject.call(this, geom, props);
						this.overlays.bringToTop();
						return ret;
					}
				}

				if (isVisible === undefined)
					isVisible = true;

				if(!layer.properties.identityField) layer.properties.identityField = "ogc_fid";
				var isRaster = (layer.properties.type == "Raster");
				//var t = layer.properties.name || layer.properties.image;
				var layerName = layer.properties.name || layer.properties.image;
				var obj = new FlashMapObject(false, {}, this);
				obj.geometry = layer.geometry;
				obj.properties = layer.properties;
				var me = this;
				var isOverlay = false;
				var overlayLayerID = gmxAPI.getBaseMapParam("overlayLayerID","");
				if(typeof(overlayLayerID) == 'string') {
					var arr = overlayLayerID.split(",");
					for (var i = 0; i < arr.length; i++) {
						if(layerName == arr[i]) {
							isOverlay = true;
							break;
						}
					}
				}

				if (isOverlay)
					layer.properties.type = "Overlay";

				obj.filters = [];
				if (!isRaster)
				{
					for (var i = 0; i < layer.properties.styles.length; i++)
					{
						var tmp = new FlashMapObject(false, {}, this);
						obj.filters.push(tmp);
						var style = layer.properties.styles[i];
						if (style.Filter && style.Filter.Name)
							obj.filters[style.Filter.Name] = tmp;
					}
				}

				var baseAddress = "http://" + layer.properties.hostName + "/";
				//var sessionKey = (layer.properties.hostName.indexOf("maps.kosmosnimki.ru") != -1 || window.KOSMOSNIMKI_SESSION_KEY) ? window.KOSMOSNIMKI_SESSION_KEY : false;
				var sessionKey = isRequiredAPIKey( layer.properties.hostName ) ? window.KOSMOSNIMKI_SESSION_KEY : false;
				var sessionKey2 = window.sessionKeyCache[layer.properties.mapName];
				var isInitial = !initialLayersAdded;
				var isInvalid = (sessionKey == "INVALID");

				var chkCenterX = function(arr)
				{ 
					var centerX = 0;
					for (var i = 0; i < arr.length; i++)
					{
						centerX += parseFloat(arr[i][0]);
					}
					centerX /= arr.length;
					var prevCenter = centerX;
					centerX = gmxAPI.chkPointCenterX(centerX);
					var dx = prevCenter - centerX;
					for (var i = 0; i < arr.length; i++)
					{
						arr[i][0] -= dx;
					}
				}

				var bounds = false;

				if (layer.geometry) {
					if(layer.geometry.type == "POLYGON") {		// Проверка сдвига границ слоя
						var arr = layer.geometry.coordinates[0];
						chkCenterX(arr);
					}
					bounds = gmxAPI.getBounds(gmxAPI.merc_geometry(layer.geometry).coordinates);
				}
				
				var tileFunction = function(i, j, z)
				{ 
					if (bounds)
					{
						var tileSize = gmxAPI.getScale(z)*256;
						var minx = i*tileSize;
						var maxx = minx + tileSize;
						if (maxx < bounds.minX) {
							i += Math.pow(2, z);
						}
						else if (minx > bounds.maxX) {
							i -= Math.pow(2, z);
						}
					}

					return baseAddress + 
						"TileSender.ashx?ModeKey=tile" + 
						"&MapName=" + layer.properties.mapName + 
						"&LayerName=" + layerName + 
						"&z=" + z + 
						"&x=" + i + 
						"&y=" + j + 
						(sessionKey ? ("&key=" + encodeURIComponent(sessionKey)) : "") +
						(sessionKey2 ? ("&MapSessionKey=" + sessionKey2) : "");
				}

				var isTemporal = layer.properties.Temporal;	// признак мультивременного слоя
				var tileDateFunction = null;
				var setDateInterval = null;
				if(isTemporal) {
					var TimeTemporal = true;	// Добавлять время в фильтры - пока только для поля layer.properties.TemporalColumnName == 'DateTime'

					var deltaArr = [];			// интервалы временных тайлов [8, 16, 32, 64, 128, 256]
					var ZeroDateString = layer.properties.ZeroDate || '01.01.2008';	// нулевая дата
					var arr = ZeroDateString.split('.');
					var ZeroDate = new Date(
						(arr.length > 2 ? arr[2] : 2008),
						(arr.length > 1 ? arr[1] - 1 : 0),
						(arr.length > 0 ? arr[0] : 1)
						);

					var temporalData = null;
					function prpTemporalTiles(data) {
						var deltaHash = {};
						var ph = {};
						var arr = [];
						for (var nm=0; nm<data.length; nm++)
						{
							arr = data[nm];
							if(!gmxAPI.isArray(arr) || arr.length < 5) {
								gmxAPI.addDebugWarnings({'func': 'prpTemporalTiles', 'layer': layer.properties.title, 'alert': 'Error in TemporalTiles array - line: '+nm+''});
								continue;
							}
							var z = arr[4];
							var i = arr[2];
							var j = arr[3];
							if(!ph[z]) ph[z] = {};
							if(!ph[z][i]) ph[z][i] = {};
							if(!ph[z][i][j]) ph[z][i][j] = [];
							ph[z][i][j].push(arr);

							if(!deltaHash[arr[0]]) deltaHash[arr[0]] = {};
							if(!deltaHash[arr[0]][arr[1]]) deltaHash[arr[0]][arr[1]] = [];
							deltaHash[arr[0]][arr[1]].push([i, j, z]);
						}
						var arr = [];
						for (var z in ph)
							for (var i in ph[z])
								for (var j in ph[z][i])
									arr.push(i, j, z);
						
						for (var delta in deltaHash) deltaArr.push(parseInt(delta));
						deltaArr = deltaArr.sort(function (a,b) { return a - b;});
						return {'dateTiles': arr, 'hash': ph, 'deltaHash': deltaHash};
					}

					temporalData = prpTemporalTiles(layer.properties.TemporalTiles);
					var oneDay = 1000*60*60*24;					// один день
					
					// Начальный интервал дат
					temporalData['DateEnd'] = new Date();
					if(layer.properties.DateEnd) {
						var arr = layer.properties.DateEnd.split('.');
						if(arr.length > 2) temporalData['DateEnd'] = new Date(arr[2], arr[1] - 1, arr[0]);
					}
					temporalData['DateBegin'] = new Date(temporalData['DateEnd'] - oneDay);

					var currentData = {};			// список тайлов для текущего daysDelta

					tileDateFunction = function(i, j, z)
					{ 
						var filesHash = currentData['tiles'] || {};
						var outArr = [];
						if(filesHash[z] && filesHash[z][i] && filesHash[z][i][j]) {
							outArr = filesHash[z][i][j];
						}
						return outArr;
					}
 
					prpTemporalFilter = function(DateBegin, DateEnd)
					{
						var dt1 = ddt1;			// начало текущих суток
						var dt2 = ddt2;			// конец текущих суток
						var tp = Object.prototype.toString.apply(DateEnd);
						if(tp === '[object Date]') dt2 = DateEnd;
						else if(tp === '[object String]') {						// формат 23.08.2011
							dt2 = gmxAPI.strToDate(DateEnd);
						}
						tp = Object.prototype.toString.apply(DateBegin);
						if(tp === '[object Date]') dt1 = DateBegin;
						else if(tp === '[object String]') {
							dt1 = gmxAPI.strToDate(DateBegin);
						}
						var dt1str = dt1.getFullYear() + "." + gmxAPI.pad2(dt1.getMonth() + 1) + "." + gmxAPI.pad2(dt1.getDate());
						if(TimeTemporal) dt1str += ' ' + gmxAPI.pad2(dt1.getHours()) + ":" + gmxAPI.pad2(dt1.getMinutes()) + ":" + gmxAPI.pad2(dt1.getSeconds());
						var dt2str = dt2.getFullYear() + "." + gmxAPI.pad2(dt2.getMonth() + 1) + "." + gmxAPI.pad2(dt2.getDate());
						if(TimeTemporal) dt2str += ' ' + gmxAPI.pad2(dt2.getHours()) + ":" + gmxAPI.pad2(dt2.getMinutes()) + ":" + gmxAPI.pad2(dt2.getSeconds());
						var TemporalColumnName = layer.properties.TemporalColumnName || 'Date';
						var curFilter = "\""+TemporalColumnName+"\" >= '"+dt1str+"' AND \""+TemporalColumnName+"\" <= '"+dt2str+"'";
						return {'dt1': dt1, 'dt2': dt2, 'ut1': parseInt(dt1.getTime()/1000), 'ut2': parseInt(dt2.getTime()/1000), 'curFilter': curFilter};
					}

					var getDateIntervalTiles = function(dt1, dt2) {			// Расчет вариантов от begDate до endDate
						var days = parseInt(1 + (dt2 - dt1)/oneDay);
						var minFiles = 1000;
						var outHash = {};

						var _prefix = baseAddress + 
							"TileSender.ashx?ModeKey=tile" + 
							"&MapName=" + layer.properties.mapName + 
							"&LayerName=" + layerName + 
							(sessionKey ? ("&key=" + encodeURIComponent(sessionKey)) : "") +
							(sessionKey2 ? ("&MapSessionKey=" + sessionKey2) : "");
						if(layer.properties._TemporalDebugPath) _prefix = layer.properties._TemporalDebugPath;

						function getFiles(daysDelta) {
							var ph = {'files': [], 'dtiles': [], 'tiles': {}, 'out': ''};
							var mn = oneDay * daysDelta;
							var zn = parseInt((dt1 - ZeroDate)/mn);
							ph['beg'] = zn;
							ph['begDate'] = new Date(ZeroDate.getTime() + daysDelta * zn * oneDay);
							zn = parseInt(zn);
							var zn1 = Math.floor((dt2 - ZeroDate)/mn);
							ph['end'] = zn1;
							ph['endDate'] = new Date(ZeroDate.getTime() + daysDelta * oneDay * (zn1 + 1) - 1000);
							zn1 = parseInt(zn1);
							var dHash = temporalData['deltaHash'][daysDelta] || {};
							for (var dz in dHash) {
								if(dz < zn || dz > zn1) continue;
								var arr = dHash[dz] || [];
								for (var i=0; i<arr.length; i++)
								{
									var pt = arr[i];
									var x = pt[0];
									var y = pt[1];
									var z = pt[2];
									var file = _prefix + "&Level=" + daysDelta + "&Span=" + dz + "&z=" + z + "&x=" + x + "&y=" + y;

									if(layer.properties._TemporalDebugPath) file = _prefix + daysDelta + '/' + dz + '/' + z + '/' + x + '/' + z + '_' + x + '_' + y + '.swf'; // тайлы расположены в WEB папке
									
									if(!ph['tiles'][z]) ph['tiles'][z] = {};
									if(!ph['tiles'][z][x]) ph['tiles'][z][x] = {};
									if(!ph['tiles'][z][x][y]) ph['tiles'][z][x][y] = [];
									ph['tiles'][z][x][y].push(file);
									ph['files'].push(file);
								}
							}
							
							var arr = [];
							for (var z in ph['tiles'])
								for (var i in ph['tiles'][z])
									for (var j in ph['tiles'][z][i])
										arr.push(i, j, z);
							ph['dtiles'] = arr;
							return ph;
						}

						var i = deltaArr.length - 1;
						var curDaysDelta = deltaArr[i];
						while (i>=0)
						{
							curDaysDelta = deltaArr[i];
							if(days >= deltaArr[i]) {
								break;
							}
							i--;
						}
						var ph = getFiles(curDaysDelta);
						minFiles = ph['files'].length;

						var hash = prpTemporalFilter(dt1, dt2);
						var curTemporalFilter = hash['curFilter'];
						var out = {
								'daysDelta': curDaysDelta
								,'files': ph['files']
								,'tiles': ph['tiles']
								,'dtiles': ph['dtiles'] || []		// список тайлов для daysDelta
								,'out': ph['out']
								,'beg': ph['beg']
								,'end': ph['end']
								,'begDate': ph['begDate']
								,'endDate': ph['endDate']
								,'ut1': hash['ut1']
								,'ut2': hash['ut2']
								,'dt1': dt1
								,'dt2': dt2
								,'curTemporalFilter': hash['curFilter']
							};

						return out;
					}
					var ddt1 = new Date(); ddt1.setHours(0, 0, 0, 0);			// начало текущих суток
					var ddt2 = new Date(); ddt2.setHours(23, 59, 59, 999);	// конец текущих суток
					currentData = getDateIntervalTiles(ddt1, ddt2);	// По умолчанию за текущие сутки

					obj.getTemporalFilter = function()
					{
						return (currentData['curTemporalFilter'] ? currentData['curTemporalFilter'] : '');
					}

					setDateInterval = function(DateBegin, DateEnd)
					{
						var hash = prpTemporalFilter(DateBegin, DateEnd);
						var dt1 = hash['dt1'];
						var dt2 = hash['dt2'];
						currentData = getDateIntervalTiles(dt1, dt2);
						return currentData['daysDelta'];
					}
				}

				var deferredMethodNames = ["setHandler", "setStyle", "setBackgroundColor", "setCopyright", "addObserver", "enableTiledQuicklooks", "enableTiledQuicklooksEx"];

				var createThisLayer = function()
				{
					var obj_ = (isOverlay ? me.overlays : me.layersParent).addObject(obj.geometry, obj.properties);
					obj.objectId = obj_.objectId;
					obj.addObject = function(geometry, props) { return FlashMapObject.prototype.addObject.call(obj, geometry, props); }
					
					if(isTemporal) {
						obj.setDateInterval = function(dt1, dt2)
						{
							var oldDt1 = currentData['begDate'];
							var oldDt2 = currentData['endDate'];
							var oldDaysDelta = currentData['daysDelta'];

							var hash = prpTemporalFilter(dt1, dt2);
							var ddt1 = hash['dt1'];
							var ddt2 = hash['dt2'];
							var data = getDateIntervalTiles(ddt1, ddt2);

							var attr = {
								'dtiles': (data['dtiles'] ? data['dtiles'] : []),
								'ut1': data['ut1'],
								'ut2': data['ut2']
							};
							if(oldDaysDelta == data['daysDelta'] && data['dt1'] >= oldDt1 && data['dt2'] <= oldDt2) {
										// если интервал временных тайлов не изменился и интервал дат не расширяется - только добавление новых тайлов 
								attr['notClear'] = true;
							} else {
								currentData = data;
								if(obj.tilesParent) {
									obj.tilesParent.clearItems();
								}
							}
							//LastDaysDelta = currentData['daysDelta'];

							if(layer.properties.visible) {
								if(attr) obj.startLoadTiles(attr);
								//curTemporalFilter = hash['curFilter'];
								for (var i=0; i<obj.filters.length; i++)	// переустановка фильтров
									obj.filters[i].setFilter(obj.filters[i]._sql, true);

								gmxAPI._listeners.chkListeners('hideBalloons', map);	// Проверка map Listeners на hideBalloons
							}
							return currentData['daysDelta'];
						}
					}
					obj.setVisible = function(flag)
					{
						FlashMapObject.prototype.setVisible.call(obj, flag);
						if(isTemporal) {
							obj.setDateInterval(currentData['dt1'], currentData['dt2']);
						}
					}

					for (var i = 0; i < deferredMethodNames.length; i++)
						delete obj[deferredMethodNames[i]];
					delete obj["getFeatures"];
					delete obj["getFeatureById"];
					if (!isRaster)
					{
						obj.setHandler = function(eventName, handler)
						{
							FlashMapObject.prototype.setHandler.call(obj, eventName, handler);
							for (var i = 0; i < obj.filters.length; i++)
								obj.filters[i].setHandler(eventName, handler);
						}
					}
					obj.addObserver = function(o, onChange)
					{
						gmxAPI._cmdProxy('observeVectorLayer', { 'obj': o, 'attr':{'layerId':obj.objectId, 'func':gmxAPI.uniqueGlobalName(function(geom, props, flag)
							{
								onChange(new FlashMapFeature(gmxAPI.from_merc_geometry(geom), props, obj), flag);
							})
						} });
					}
					if (isRaster) {
						obj.setBackgroundTiles(tileFunction, 0, layer.properties['MinZoom'], layer.properties['MaxZoom']);
					} else
					{
						obj.getFeatures = function()
						{
							var callback, geometry, str;
							for (var i = 0; i < 3; i++)
							{
								var arg = arguments[i];
								if (typeof arg == 'function')
									callback = arg;
								else if (typeof arg == 'string')
									str = arg;
								else if (typeof arg == 'object')
									geometry = arg;
							}
							if (!str && (obj.properties.GeometryType == "point")) {
								gmxAPI._cmdProxy('getFeatures', { 'obj': obj, 'attr':{
									'geom': gmxAPI.merc_geometry(geometry ? geometry : { type: "POLYGON", coordinates: [[-180, -89, -180, 89, 180, 89, 180, -89]] }),
									'func': gmxAPI.uniqueGlobalName(function(geoms, props)
										{
											var ret = [];
											for (var i = 0; i < geoms.length; i++)
												ret.push(new FlashMapFeature(
													gmxAPI.from_merc_geometry(geoms[i]),
													props[i],
													obj
												));
											callback(ret);
										})
									}
								});
							}
							else
								map.getFeatures(str, geometry, callback, [obj.properties.name]);
						}

						obj.getFeatureById = function(fid, func)
						{
							gmxAPI._cmdProxy('getFeatureById', { 'obj': obj, 'attr':{'fid':fid,
								'func':gmxAPI.uniqueGlobalName(function(geom, props)
								{
									if(typeof(props) === 'object' && props.length > 0) {
										props = gmxAPI.arrayToHash(props);
									}
									func(new FlashMapFeature(
										gmxAPI.from_merc_geometry(geom),
										props,
										obj
									));
								})
							} });
						}

						if(isTemporal) {	// Для мультивременных слоёв
							var arr = (currentData['dtiles'] ? currentData['dtiles'] : []);
							var temporal = {
								'temporalFilter': obj.getTemporalFilter
								,'TemporalColumnName': layer.properties.TemporalColumnName
								,'ut1': currentData['ut1']
								,'ut2': currentData['ut2']
							};
							obj.setVectorTiles(tileDateFunction, layer.properties.identityField, arr, temporal);
							obj.startLoadTiles = function(attr) {
								var ret = gmxAPI._cmdProxy('startLoadTiles', { 'obj': obj, 'attr':attr });
								return ret;
							}
						} else {
							obj.setVectorTiles(tileFunction, layer.properties.identityField, layer.properties.tiles);
						}
						obj.setStyle = function(style, activeStyle)
						{
							for (var i = 0; i < obj.filters.length; i++)
								obj.filters[i].setStyle(style, activeStyle);
						}

						reSetStyles(layer.properties.styles, obj);
						obj.reSetStyles =  function(styles)
						{
							for (var i = 0; i < obj.filters.length; i++) {
								obj.filters[i].remove();
							}
							obj.filters = [];
							reSetStyles(styles, obj);
						}
						// Изменить атрибуты векторного обьекта из загруженных тайлов
						obj.setTileItem = function(data, flag) {
							var _obj = gmxAPI._cmdProxy('setTileItem', { 'obj': this, 'attr': {'data':data, 'flag':(flag ? true:false)} });
							return _obj;
						}
						// Получить атрибуты векторного обьекта из загруженных тайлов id по identityField
						obj.getTileItem = function(vId) {
							var _obj = gmxAPI._cmdProxy('getTileItem', { 'obj': this, 'attr': vId });
							if(_obj.geometry) _obj.geometry = gmxAPI.from_merc_geometry(_obj.geometry);
							return _obj;
						}
						obj.getStat = function() {
							var _obj = gmxAPI._cmdProxy('getStat', { 'obj': this });
							return _obj;
						}
						obj.setTiles = function(data, flag) {
							var _obj = gmxAPI._cmdProxy('setTiles', { 'obj': obj, 'attr':{'tiles':data, 'flag':(flag ? true:false)} });
							return _obj;
						}

						if (layer.properties.Quicklook)
							obj.enableQuicklooks(function(o)
							{
								return gmxAPI.applyTemplate(layer.properties.Quicklook, o.properties);
							});
						if (layer.properties.TiledQuicklook)
							obj.enableTiledQuicklooks(function(o)
							{
								return gmxAPI.applyTemplate(layer.properties.TiledQuicklook, o.properties);
							}, layer.properties.TiledQuicklookMinZoom);
					}

					for (var i = 0; i < obj.filters.length; i++)
					{
						var filter = obj.filters[i];
						delete filter["setVisible"];
						delete filter["setStyle"];
						delete filter["setFilter"];
						delete filter["enableHoverBalloon"];
					}

					if (!isInvalid) {
						var tmp = getMinMaxZoom(layer.properties);
						obj.setZoomBounds(tmp['minZoom'], tmp['maxZoom']);
					} else {
						obj.setZoomBounds(20, 20);
					}

					if (layer.properties.Copyright)
						obj.setCopyright(layer.properties.Copyright);
				}

				obj.isVisible = isVisible;
				if (isVisible) {
					createThisLayer();
				}
				else
				{
					var deferred = [];
					obj.setVisible = function(flag)
					{
						if (flag)
						{
							createThisLayer();
							var n = 0;
							for (var i = 0; i < myIdx; i++)
							{
								var l = me.layers[i];
								if (l.objectId && (l.properties.type != "Overlay"))
									n += 1;
							}
							if(obj.objectId) FlashMapObject.prototype.setVisible.call(obj, flag);
							obj.bringToDepth(n);
							for (var i = 0; i < deferred.length; i++)
								deferred[i]();
						}
					}
					if(isTemporal) {
						obj.setDateInterval = function(dt1, dt2)
						{
							obj.setVisible(true);
							var daysDelta = setDateInterval(dt1, dt2);
							obj.setVisible(false);
							return daysDelta;
						}
					}
					if (!isRaster) {
						// Изменять атрибуты векторного обьекта при невидимом слое нельзя
						obj.setTileItem = function(data, flag) {
							return false;
						}
						// Получить атрибуты векторного обьекта при невидимом слое нельзя
						obj.getTileItem = function(vId) {
							return null;
						}
					}
					obj.addObject = function(geometry, props)
					{
						obj.setVisible(true);
						var newObj = FlashMapObject.prototype.addObject.call(obj, geometry, props);
						obj.setVisible(false);
						return newObj;
					}
					for (var i = 0; i < deferredMethodNames.length; i++) (function(name)
					{
						obj[name] = function(p1, p2, p3, p4) 
						{ 
							deferred.push(function() { obj[name].call(obj, p1, p2, p3, p4); });
						}
					})(deferredMethodNames[i]);
					if (!isRaster)
					{
						obj.getFeatures = function(arg1, arg2, arg3)
						{							
							obj.setVisible(true);
							obj.getFeatures(arg1, arg2, arg3);
							obj.setVisible(false);
						}
						obj.getFeatureById = function(arg1, arg2, arg3)
						{							
							obj.setVisible(true);
							obj.getFeatureById(arg1, arg2, arg3);
							obj.setVisible(false);
						}
						for (var i = 0; i < layer.properties.styles.length; i++) (function(i)
						{
							obj.filters[i].setVisible = function(flag)
							{
								deferred.push(function() { obj.filters[i].setVisible(flag); });
							}
							obj.filters[i].setStyle = function(style, activeStyle)
							{
								deferred.push(function() { obj.filters[i].setStyle(style, activeStyle); });
							}
							obj.filters[i].setFilter = function(sql)
							{
								deferred.push(function() { obj.filters[i].setFilter(sql); });
								return true;
							}
							obj.filters[i].enableHoverBalloon = function(callback)
							{
								deferred.push(function() { obj.filters[i].enableHoverBalloon(callback); });
							}
						})(i);
					}
				}

				if (isRaster && (layer.properties.MaxZoom > maxRasterZoom))
					maxRasterZoom = layer.properties.MaxZoom;
				var myIdx = this.layers.length;
				this.layers.push(obj);
				this.layers[layerName] = obj;
				if (!layer.properties.title.match(/^\s*[0-9]+\s*$/))
					this.layers[layer.properties.title] = obj;
				return obj;
			}

			FlashMapObject.prototype.observeVectorLayer = function(obj, onChange)
			{
				obj.addObserver(this, onChange);
			}

			FlashMapObject.prototype.addOSM = function()
			{
				var osm = this.addObject();
				osm.setOSMTiles();
				return osm;
			}

			// keepGeometry - если не указан или false, объект будет превращён в полигон размером во весь мир (показывать OSM везде), 
			//                иначе геометрия не будет изменяться (например, чтобы делать вклейки из OSM в другие тайлы)
			FlashMapObject.prototype.setOSMTiles = function( keepGeometry)
			{
				if (!keepGeometry)
					this.setPolygon([-180, -85, -180, 85, 180, 85, 180, -85, -180, -85]);
					
				var func = window.OSMTileFunction ? window.OSMTileFunction : function(i, j, z)
				{
					//return "http://b.tile.openstreetmap.org/" + z + "/" + i + "/" + j + ".png";
					var letter = ["a", "b", "c", "d"][((i + j)%4 + 4)%4];
					return "http://" + letter + ".tile.osmosnimki.ru/kosmo" + gmxAPI.KOSMOSNIMKI_LOCALIZED("", "-en") + "/" + z + "/" + i + "/" + j + ".png";
				}
				this.setBackgroundTiles(function(i, j, z)
				{
					var size = Math.pow(2, z - 1);
					return func(i + size, size - j - 1, z);
				}, 1);
				
				this.setCopyright("<a href='http://openstreetmap.org'>&copy; OpenStreetMap</a>, <a href='http://creativecommons.org/licenses/by-sa/2.0/'>CC-BY-SA</a>");
					
				this.setBackgroundColor(0xffffff);
				this.setTileCaching(false);
			}

			var map = new FlashMapObject(rootObjectId, {}, null);
			gmxAPI.map = map;
			map.onSetVisible = {};
			map.layers = [];
			map.rasters = map;
			map.tiledQuicklooks = map;
			map.vectors = map;

			// Методы присущие только Map
			map.stopDragging = function() {	gmxAPI._cmdProxy('stopDragging', { }); }
			map.isDragging = function() { return gmxAPI._cmdProxy('isDragging', { }); }
			map.resumeDragging = function() { gmxAPI._cmdProxy('resumeDragging', { }); }
			map.setCursorVisible = function(flag) { gmxAPI._cmdProxy('setCursorVisible', { 'attr': {'flag':flag} }); }
			map.getPosition = function() { return gmxAPI._cmdProxy('getPosition', { }); }
			map.getX = function() { return gmxAPI._cmdProxy('getX', {}); }
			map.getY = function() { return gmxAPI._cmdProxy('getY', {}); }
			map.getZ = function() { return gmxAPI._cmdProxy('getZ', {}); }
			map.getMouseX = function() { return gmxAPI._cmdProxy('getMouseX', {}); }
			map.getMouseY = function() { return gmxAPI._cmdProxy('getMouseY', {}); }
			map.isKeyDown = function(code) { return gmxAPI._cmdProxy('isKeyDown', {'attr':{'code':code} }); }
			map.setExtent = function(x1, x2, y1, y2) { return gmxAPI._cmdProxy('setExtent', {'attr':{'x1':gmxAPI.merc_x(x1), 'x2':gmxAPI.merc_x(x2), 'y1':gmxAPI.merc_y(y1), 'y2':gmxAPI.merc_y(y2)} }); }
			map.addMapWindow = function(callback) {
				var oID = gmxAPI._cmdProxy('addMapWindow', { 'attr': {'callbackName':gmxAPI.uniqueGlobalName(function(z) { return 17 - callback(17 - z); })} });
				return new FlashMapObject(oID, {}, null);
			}
            
            map.width  = function() { return div.clientWidth;  }
            map.height = function() { return div.clientHeight; }

			map.getItemsFromExtent = function(x1, x2, y1, y2) {
				var arr = [];
				for (var i = 0; i < map.layers.length; i++) arr.push(map.layers[i].objectId);
				return gmxAPI._cmdProxy('getItemsFromExtent', { 'obj': this, 'attr':{'layers':arr, 'extent':{'x1':gmxAPI.merc_x(x1), 'x2':gmxAPI.merc_x(x2), 'y1':gmxAPI.merc_y(y1), 'y2':gmxAPI.merc_y(y2)}} });
			}

			map.getItemsFromPosition = function() {
				var arr = [];
				for (var i = 0; i < map.layers.length; i++) arr.push(map.layers[i].objectId);
				return gmxAPI._cmdProxy('getItemsFromExtent', { 'obj': this, 'attr':{'layers':arr} });
			}
			// Использование SharedObject
			map.setFlashLSO = function(data) { return gmxAPI._cmdProxy('setFlashLSO', {'obj': this, 'attr':data }); }

			var needToStopDragging = false;
			flashDiv.onmouseout = function() 
			{ 
				needToStopDragging = true;
				map.setCursorVisible(false);
			}
			flashDiv.onmouseover = function()
			{
				if (needToStopDragging)
					map.stopDragging();
				map.setCursorVisible(true);
				needToStopDragging = false;
			}

			gmxAPI._listeners.chkListeners('mapInit', null, map);	// Глобальный Listeners

			var toolHandlers = {};
			var userHandlers = {};
			var updateMapHandler = function(eventName)
			{
				var h1 = toolHandlers[eventName];
				var h2 = userHandlers[eventName];
				FlashMapObject.prototype.setHandler.call(map, eventName, h1 ? h1 : h2 ? h2 : null);
			}
			map.setHandler = function(eventName, callback)
			{
				userHandlers[eventName] = callback;
				updateMapHandler(eventName);
			}
			var setToolHandler = function(eventName, callback)
			{
				toolHandlers[eventName] = callback;
				updateMapHandler(eventName);
			}
			gmxAPI._setToolHandler = setToolHandler;

			var setToolHandlers = function(handlers)
			{
				for (var eventName in handlers)
					setToolHandler(eventName, handlers[eventName]);
			}

			map.getFeatures = function()
			{
				var callback, geometry, str;
				for (var i = 0; i < 3; i++)
				{
					var arg = arguments[i];
					if (typeof arg == 'function')
						callback = arg;
					else if (typeof arg == 'string')
						str = arg;
					else if (typeof arg == 'object')
						geometry = arg;
				}
				var layerNames = arguments[3];
				if (!layerNames)
				{
					layerNames = [];
					for (var i = 0; i < map.layers.length; i++)
					{
						var layer = map.layers[i];
						if ((layer.properties.type == 'Vector') && layer.AllowSearch)
							layerNames.push(layer.properties.name);
					}
				}
				if (layerNames.length == 0)
				{
					callback([]);
					return;
				}
				if (!geometry)
					geometry = { type: "POLYGON", coordinates: [[-180, -89, -180, 89, 180, 89, 180, -89, -180, -89]] };
				var url = "http://" + map.layers[layerNames[0]].properties.hostName + "/SearchObject/SearchVector.ashx" + 
					"?LayerNames=" + layerNames.join(",") + 
					"&MapName=" + map.layers[layerNames[0]].properties.mapName +
					(str ? ("&SearchString=" + escape(str)) : "") +
					(geometry ? ("&border=" + JSON.stringify(gmxAPI.merc_geometry(geometry))) : "");
				sendCrossDomainJSONRequest(
					url,
					function(searchReq)
					{
						var ret = [];
						if (searchReq.Status == 'ok')
						{
							for (var i = 0; i < searchReq.Result.length; i++)
							{
								var req = searchReq.Result[i];
								if (!ret[req.name])
									ret[req.name] = [];
								for (var j = 0; j < req.SearchResult.length; j++)
								{
									var item = req.SearchResult[j];
									ret.push(new FlashMapFeature( 
										gmxAPI.from_merc_geometry(item.geometry),
										item.properties,
										map.layers[req.name]
									));
								}
							}
						}						
						callback(ret);
					}
				);
			}

			map.geoSearchAPIRoot = typeof window.searchAddressHost !== 'undefined' ? window.searchAddressHost : getAPIHostRoot();
			map.sendSearchRequest = function(str, callback)
			{
				sendCrossDomainJSONRequest(
					map.geoSearchAPIRoot + "SearchObject/SearchAddress.ashx?SearchString=" + escape(str),
					function(res)
					{
						var ret = {};
						if (res.Status == 'ok')
						{
							for (var i = 0; i < res.Result.length; i++)
							{
								var name = res.Result[i].name;
								if (!ret[name])
									ret[name] = res.Result[i].SearchResult;
							}
						}								
						callback(ret);
					}
				);
			}

			map.addContextMenuItem = function(text, callback)
			{
				gmxAPI._cmdProxy('addContextMenuItem', { 'attr': {
					'text': text,
					'func': gmxAPI.uniqueGlobalName(function(x, y)
						{
							callback(gmxAPI.from_merc_x(x), gmxAPI.from_merc_y(y));
						})
					}
				});
			}

			map.addContextMenuItem(
				gmxAPI.KOSMOSNIMKI_LOCALIZED("Поставить маркер", "Add marker"),
				function(x, y)
				{
					map.drawing.addObject({type: "POINT", coordinates: [x, y]});
				}
			);
			map.grid = {
				setVisible: function(flag) { gmxAPI._cmdProxy('setGridVisible', { 'attr': flag }) },
				getVisibility: function() { return gmxAPI._cmdProxy('getGridVisibility', {}) }
			};

			var allTools = gmxAPI.newStyledDiv({ position: "absolute", top: 0, left: 0 });
			div.appendChild(allTools);
			gmxAPI._allToolsDIV = allTools;

			//Begin: tools
			var toolsAll = new gmxAPI._ToolsAll(allTools);
			map.toolsAll = toolsAll;
			var drawFunctions = gmxAPI._drawFunctions;
			map.drawing = gmxAPI._drawing
			map.drawing.addMapStateListener = function(eventName, func) { return addMapStateListener(this, eventName, func); }
			map.drawing.removeMapStateListener = function(eventName, id){ return removeMapStateListener(this, eventName, id); }

			var baseLayers = {};
			var currentBaseLayerName = false;
			FlashMapObject.prototype.setAsBaseLayer = function(name, attr)
			{
				if (!baseLayers[name])
					baseLayers[name] = [];
				baseLayers[name].push(this);
				if(!this.objectId) {	// Подложки должны быть в SWF
					this.setVisible(true);
					this.setVisible(false);
				}
				map.toolsAll.baseLayersTools.chkBaseLayerTool(name, attr);
			}
			map.getCurrentBaseLayerName = function()
			{
				return currentBaseLayerName;
			}
			map.unSetBaseLayer = function()
			{
				for (var oldName in baseLayers)
					for (var i = 0; i < baseLayers[oldName].length; i++)
						baseLayers[oldName][i].setVisible(false);
				currentBaseLayerName = '';
			}
			map.setBaseLayer = function(name)
			{
				for (var oldName in baseLayers)
					if (oldName != name)
						for (var i = 0; i < baseLayers[oldName].length; i++)
							baseLayers[oldName][i].setVisible(false);
				currentBaseLayerName = name;
				var newBaseLayers = baseLayers[currentBaseLayerName];
				if (newBaseLayers)
					for (var i = 0; i < newBaseLayers.length; i++)
						newBaseLayers[i].setVisible(true);
			}
			map.getBaseLayer = function()
			{
				return currentBaseLayerName;
			}

			map.baseLayerControl = {
				isVisible: true,
				setVisible: function(flag)
				{
					map.toolsAll.baseLayersTools.setVisible(flag);
				},
				updateVisibility: function()
				{
					map.toolsAll.baseLayersTools.updateVisibility();
				},
				repaint: function()
				{
					map.toolsAll.baseLayersTools.repaint();
				}, 

				getBaseLayerNames: function()
				{
					var res = [];
					for (var k in baseLayers) res.push(k);
					return res;
				},
				getBaseLayerLayers: function(name)
				{
					return baseLayers[name];
				}
			}

			var zoomParent = gmxAPI.newStyledDiv({
				position: "absolute",
				left: "40px",
				top: "5px"
			});
			allTools.appendChild(zoomParent);
			var zoomPlaque = gmxAPI.newStyledDiv({
				backgroundColor: "#016a8a",
				opacity: 0.5,
				position: "absolute",
				left: 0,
				top: 0
			});
			zoomParent.appendChild(zoomPlaque);

			zoomParent.appendChild(gmxAPI.newElement(
				"img",
				{
					src: apiBase + "img/zoom_minus.png",
					onclick: function()
					{
						map.zoomBy(-1);
					},
					onmouseover: function()
					{
						this.src = apiBase + "img/zoom_minus_a.png";
					},
					onmouseout: function()
					{
						this.src = apiBase + "img/zoom_minus.png"
					}
				},
				{
					position: "absolute",
					left: "5px",
					top: "7px",
					cursor: "pointer"
				}
			));
			var zoomPlus = gmxAPI.newElement(
				"img",
				{
					src: apiBase + "img/zoom_plus.png",
					onclick: function()
					{
						map.zoomBy(1);
					},
					onmouseover: function()
					{
						this.src = apiBase + "img/zoom_plus_a.png";
					},
					onmouseout: function()
					{
						this.src = apiBase + "img/zoom_plus.png"
					}
				},
				{
					position: "absolute",
					cursor: "pointer"
				}
			)
			zoomParent.appendChild(zoomPlus);

			var addZoomItem = function(i)
			{
				var zoomObj_ = gmxAPI.newElement(
					"img",
					{
						src: apiBase + "img/zoom_raw.png",
						title: "" + (i + 1),
						onclick: function()
						{
							map.zoomBy(i + minZoom - map.getZ());
						},
						onmouseover: function()
						{
							this.src = apiBase + "img/zoom_active.png";
							this.title = "" + (i + minZoom);
						},
						onmouseout: function()
						{
							this.src = (this == zoomObj) ? (apiBase + "img/zoom_active.png") : (apiBase + "img/zoom_raw.png");
						}
					},
					{
						position: "absolute",
						left: (22 + 12*i) + "px",
						top: "12px",
						width: "12px",
						height: "8px",
						border: 0,
						cursor: "pointer"
					}
				);
				zoomParent.appendChild(zoomObj_);
				zoomArr.push(zoomObj_);
			};

			var zoomArr = [];
			var zoomObj = false;
			for (var i = 0; i < 20; i++)
			{
				addZoomItem(i);
			}

			var minZoom, maxZoom;
			map.zoomControl = {
				isVisible: true,
				isMinimized: false,
				setVisible: function(flag)
				{
					gmxAPI.setVisible(zoomParent, flag);
					this.isVisible = flag;
					positionTimeBar();
				},
				repaint: function()
				{
					var dz = maxZoom - minZoom + 1;
					var gap = this.isMinimized ? 8 : 12*dz;
					gmxAPI.position(zoomPlus, 20 + gap, 7);
					gmxAPI.size(zoomPlaque, 43 + gap, 32);
					map.zoomControl.width = 43 + gap;
					for (var i = 0; i < dz; i++) {
						if(i == zoomArr.length) addZoomItem(i);
						gmxAPI.setVisible(zoomArr[i], !this.isMinimized && (i < dz));
					}
					if(dz < zoomArr.length) for (var i = dz; i < zoomArr.length; i++) gmxAPI.setVisible(zoomArr[i], false);
					positionTimeBar();
				},
				minimize: function()
				{
					this.isMinimized = true;
					this.repaint();
				},
				maximize: function()
				{
					this.isMinimized = false;
					this.repaint();
				}
			}

			map.setMinMaxZoom = function(z1, z2) {
				minZoom = z1;
				maxZoom = z2;
				map.zoomControl.repaint();
				return gmxAPI._cmdProxy('setMinMaxZoom', {'attr':{'z1':z1, 'z2':z2} });
			}

			var timeBarWidth = 100;
			var leftMarkX = 0;
			var rightMarkX = timeBarWidth;

			var timeBarParent = gmxAPI.newStyledDiv({
				position: "absolute",
				top: "5px",
				display: "none"
			});
			allTools.appendChild(timeBarParent);
			var timeBarPlaque = gmxAPI.newStyledDiv({
				backgroundColor: "#016a8a",
				opacity: 0.5,
				position: "absolute",
				left: 0,
				top: 0,
				height: "32px"
			});
			timeBarParent.appendChild(timeBarPlaque);
			var timeBar = gmxAPI.newStyledDiv({
				position: "absolute",
				height: "4px",
				border: "1px solid white",
				backgroundColor: "#387eaa",
				top: "13px",
				left: "13px"
			});
			timeBarParent.appendChild(timeBar);
 
			timeBar.style.width = timeBarWidth + 12 + "px";
			timeBarPlaque.style.width = timeBarWidth + 40 + "px";

			var positionTimeBar = function()
			{
				gmxAPI.position(
					timeBarParent, 
					40 + (map.zoomControl.isVisible ? (map.zoomControl.width + 3) : 0),
					5
				);
			}

			var minTime, maxTime;
			var tickMarks = [];
			var timeBarMinYear = 2050;
			window.updateTimeBarMinYear = function(year)
			{
				if (year >= timeBarMinYear)
					return;
				timeBarMinYear = year;
				minTime = new Date(year, 6, 1).getTime();
				maxTime = new Date().getTime();

				for (var i = 0; i < tickMarks.length; i++)
					timeBar.removeChild(tickMarks[i]);
				tickMarks = [];

				var curTime = new Date(year, 1, 1).getTime();
				while (curTime < maxTime)
				{
					var tickMark = gmxAPI.newStyledDiv({
						position: "absolute",
						height: "4px",
						top: 0,
						width: 0,
						borderLeft: "1px solid #b0b0b0",
						left: 6 + Math.round(timeBarWidth*(curTime - minTime)/(maxTime - minTime)) + "px"
					});
					tickMarks.push(tickMark);
					timeBar.appendChild(tickMark);
					var curDate = new Date(curTime);
					curTime = new Date(curDate.getFullYear(), curDate.getMonth() + 1, curDate.getDate()).getTime();
				}
				updateTimeBar();
			}

			var mouseInMark = false;
			var leftMark = gmxAPI.newElement(
				"img",
				{
					src: apiBase + "img/sliderIcon.png",
					onmousedown: function(event)
					{
						return startDraggingMark(event, false);
					},
					onmouseover: function()
					{
						this.src = apiBase + "img/sliderIcon_a.png";
						repaintDateTooltip(false);
						mouseInMark = true;
					},
					onmouseout: function()
					{
						this.src = apiBase + "img/sliderIcon.png";
						gmxAPI.hide(dateTooltip);
						mouseInMark = false;
					}
				},
				{
					display: "block",
					position: "absolute",
					top: "-5px",
					width: "12px",
					height: "14px",
					cursor: "pointer",
					marginLeft: "-6px"
				}
			);
			timeBar.appendChild(leftMark);
 
			var rightMark = gmxAPI.newElement(
				"img",
				{
					src: apiBase + "img/sliderIcon.png",
					onmousedown: function(event)
					{
						return startDraggingMark(event, true);
					},
					onmouseover: function()
					{
						this.src = apiBase + "img/sliderIcon_a.png";
						repaintDateTooltip(true);
						mouseInMark = true;
					},
					onmouseout: function()
					{
						this.src = apiBase + "img/sliderIcon.png";
						gmxAPI.hide(dateTooltip);
						mouseInMark = false;
					}
				},
				{
					display: "block",
					position: "absolute",
					top: "-5px",
					width: "12px",
					height: "14px",
					cursor: "pointer",
					marginLeft: "6px"
				}
			);
			timeBar.appendChild(rightMark);

			var getDateByX = function(x)
			{
				return new Date(minTime + (x/timeBarWidth)*(maxTime - minTime));
			}

			var getDateString = function(date)
			{
				return date.getFullYear() + "-" + gmxAPI.pad2(date.getMonth() + 1) + "-" + gmxAPI.pad2(date.getDate());
			}

			var getDatePretty = function(date)
			{
				return date.getDate() + " " + ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"][date.getMonth()] + " " + date.getFullYear();
			}
 
			var filterUpdateTimeout = false;
 
			var updateTimeBar = function()
			{
				if (!map.timeBar.isVisible)
					return;
				leftMark.style.left = leftMarkX + "px";
				rightMark.style.left = rightMarkX + "px";
				var leftDate = getDateByX(leftMarkX);
				var rightDate = getDateByX(rightMarkX);
				var leftDateString = getDateString(leftDate);
				var rightDateString = getDateString(rightDate);
				if (filterUpdateTimeout)
					clearTimeout(filterUpdateTimeout);
				filterUpdateTimeout = setTimeout(function()
				{
					for (var i = 0; i < map.layers.length; i++)
					{
						var layer = map.layers[i];
						if ((layer.isVisible || layer.hiddenByTimeBar) && (layer.properties.type == "Vector") && (layer.properties.description.toLowerCase() == "спутниковое покрытие"))
						{
							var attrs = layer.properties.attributes;
							var hasDateAttribute = false;
							for (var j = 0; j < attrs.length; j++)
							{
								var attr = attrs[j];
								if (attr.toLowerCase() == "date")
								{
									hasDateAttribute = true;
									var filterString = "`" + attr + "` >= '" + leftDateString + "' AND `" + attr + "` <= '" + rightDateString + "'";
									var filters = layer.filters;
									for (var k = 0; k < filters.length; k++)
									{
										var lastFilter = layer.properties.styles[k].Filter;
										filters[k].setFilter((lastFilter && (lastFilter == "")) ? ("(" + lastFilter + ") AND" + filterString) : filterString);
									}
								}
							}
							if (!hasDateAttribute)
							{
								var date = layer.properties.date;
								if (date.length == 10)
								{
									var date2 = date.substring(6, 10) + "-" + date.substring(3, 5) + "-" + date.substring(0, 2);
									var dateInRange = ((date2 >= leftDateString) && (date2 <= rightDateString));
									if (layer.isVisible && !dateInRange)
									{
										//layer.hiddenByTimeBar = true;
										//layer.setVisible(false);
									}
									else if (!layer.isVisible && layer.hiddenByTimeBar && dateInRange)
									{
										layer.hiddenByTimeBar = false;
										layer.setVisible(true);
									}
								}
							}
						}
					}
					filterUpdateTimeout = false;
				}, 50);
			}
 
			var startDraggingMark = function(event, isRight)
			{
				var startMouseX = gmxAPI.eventX(event);
				var startX = isRight ? rightMarkX : leftMarkX;
				document.documentElement.onmousemove = function(event)
				{
					var newX = startX + (gmxAPI.eventX(event) - startMouseX);
					if (isRight)
						rightMarkX = Math.max(leftMarkX, Math.min(timeBarWidth, newX));
					else
						leftMarkX = Math.min(rightMarkX, Math.max(0, newX));
					repaintDateTooltip(isRight);
					updateTimeBar();
					return false;
				}
				document.documentElement.onmouseup = function(event)
				{
					document.documentElement.onmousemove = null;
					document.documentElement.onmouseup = null;
					if (event && event.stopPropagation)
						event.stopPropagation();
					if (!mouseInMark)
						gmxAPI.hide(dateTooltip);
					return false;
				}
				if (event && event.stopPropagation)
					event.stopPropagation();
				return false;
			}

			var dateTooltip = gmxAPI.newStyledDiv({
				position: "absolute",
				top: "30px",
				padding: "3px",
				fontSize: "11px",
				fontFamily: "sans-serif",
				border: "1px solid black",
				backgroundColor: "#ffffe0",
				whiteSpace: "nowrap",
				display: "none"
			});
			timeBar.appendChild(dateTooltip);

			var repaintDateTooltip = function(isRight)
			{
				gmxAPI.show(dateTooltip);
				var x = isRight ? rightMarkX : leftMarkX;
				dateTooltip.style.left = x + (isRight ? 10 : 0);
				dateTooltip.innerHTML = getDatePretty(getDateByX(x));
			}

			map.timeBar = {
				isVisible: false,
				setVisible: function(flag)
				{
					this.isVisible = flag;
					gmxAPI.setVisible(timeBarParent, flag);
					if (flag)
						updateTimeBar();
				}
			}
			window.updateTimeBarMinYear(2010);

			map.setMinMaxZoom(1, 17);

			var haveOSM = false;

			var miniMapZoomDelta = -4;
			map.addLayers = function(layers)
			{
				var b = gmxAPI.getBounds();
				var minLayerZoom = 20;
				forEachLayer(layers, function(layer, isVisible) 
				{ 
					map.addLayer(layer, isVisible);
					b.update(layer.geometry.coordinates);
					for (var i = 0; i < layer.properties.styles.length; i++)
						minLayerZoom = Math.min(minLayerZoom, layer.properties.styles[i].MinZoom);
				});
				if (layers.properties.UseOpenStreetMap && !haveOSM)
				{
					var o = map.addObject();
					o.bringToBottom();
					o.setOSMTiles();
					o.setAsBaseLayer("OSM");
					haveOSM = true;

					if (!miniMapAvailable)
					{
						map.miniMap.setVisible(true);
						var miniOSM = map.miniMap.addObject();
						miniOSM.setOSMTiles();
						miniOSM.setAsBaseLayer("OSM");
						map.setBaseLayer("OSM");
					}
					else
					{
						var miniOSM = map.miniMap.addObject();
						miniOSM.setOSMTiles();
						miniOSM.setAsBaseLayer("OSM");
						miniOSM.setVisible(false);
						o.setVisible(false);
					}
				}
				if (layers.properties.DefaultLat && layers.properties.DefaultLong && layers.properties.DefaultZoom)
					map.moveTo(
						parseFloat(layers.properties.DefaultLong),
						parseFloat(layers.properties.DefaultLat),
						parseInt(layers.properties.DefaultZoom)
					);
				else
				{
					var z = map.getBestZ(b.minX, b.minY, b.maxX, b.maxY);
					if (minLayerZoom != 20)
						z = Math.max(z, minLayerZoom);
					map.moveTo(
						gmxAPI.from_merc_x((gmxAPI.merc_x(b.minX) + gmxAPI.merc_x(b.maxX))/2),
						gmxAPI.from_merc_y((gmxAPI.merc_y(b.minY) + gmxAPI.merc_y(b.maxY))/2),
						z
					);
				}
				if (layers.properties.ViewUrl && !window.suppressDefaultPermalink)
				{
					var result = (/permalink=([a-zA-Z0-9]+)/g).exec(layers.properties.ViewUrl);
					if (result)
					{
						var permalink = result[1];
						var callbackName = gmxAPI.uniqueGlobalName(function(obj)
						{
							if (obj.position)
								map.moveTo(gmxAPI.from_merc_x(obj.position.x), gmxAPI.from_merc_y(obj.position.y), 17 - obj.position.z);
							if (obj.drawnObjects)
								for (var i =0; i < obj.drawnObjects.length; i++)
								{
									var o = obj.drawnObjects[i];
									map.drawing.addObject(gmxAPI.from_merc_geometry(o.geometry), o.properties);
								}
						});
						var script = document.createElement("script");
						script.setAttribute("charset", "UTF-8");
						script.setAttribute("src", "http://" + layers.properties.hostName + "/TinyReference.ashx?id=" + permalink + "&CallbackName=" + callbackName + "&" + Math.random());
						document.getElementsByTagName("head").item(0).appendChild(script);
					}
				}
				if (layers.properties.MinViewX)
				{
					map.setExtent(
						layers.properties.MinViewX,
						layers.properties.MaxViewX,
						layers.properties.MinViewY,
						layers.properties.MaxViewY
					);
				}
				if (maxRasterZoom > 17)
					map.setMinMaxZoom(1, maxRasterZoom);
				if (layers.properties.Copyright)
				{
					var obj = map.addObject();
					obj.setCopyright(layers.properties.Copyright);
				}
				if (layers.properties.MiniMapZoomDelta)
					miniMapZoomDelta = layers.properties.MiniMapZoomDelta;
				if (layers.properties.OnLoad && layers.properties.name !== kosmosnimki_API)	//  Обработка маплета карты - для базовой уже вызывали
				{
					try { eval("_kosmosnimki_temp=(" + layers.properties.OnLoad + ")")(map); }
					catch (e) {
						gmxAPI.addDebugWarnings({'func': 'addLayers', 'handler': 'OnLoad', 'event': e, 'alert': 'Error in "'+layers.properties.title+'" mapplet: ' + e});
					}
				}
			}

			map.getScreenGeometry = function()
			{
				var e = map.getVisibleExtent();
				return {
					type: "POLYGON",
					coordinates: [[[e.minX, e.minY], [e.minX, e.maxY], [e.maxX, e.maxY], [e.maxX, e.minY], [e.minX, e.minY]]]
				};
			}
			map.getVisibleExtent = function()
			{
				var ww = 2 * gmxAPI.worldWidthMerc;
				var currPosition = map.getPosition();
				var x = currPosition['x'] + ww;
				x = x % ww;
				if(x > gmxAPI.worldWidthMerc) x -= ww;
				if(x < -gmxAPI.worldWidthMerc) x += ww;

				var y = currPosition['y'];
				var scale = gmxAPI.getScale(currPosition['z']);

				var w2 = scale*div.clientWidth/2;
				var h2 = scale*div.clientHeight/2;
				return {
					minX: gmxAPI.from_merc_x(x - w2),
					minY: gmxAPI.from_merc_y(y - h2),
					maxX: gmxAPI.from_merc_x(x + w2),
					maxY: gmxAPI.from_merc_y(y + h2)
				};
			}
			var getLocalScale = function(x, y)
			{
				return gmxAPI.distVincenty(x, y, gmxAPI.from_merc_x(gmxAPI.merc_x(x) + 40), gmxAPI.from_merc_y(gmxAPI.merc_y(y) + 30))/50;
			}

            
			FlashMapObject.prototype.addMapStateListener = function(eventName, func) { 	return addMapStateListener(this, eventName, func);	}
			FlashMapObject.prototype.removeMapStateListener = function(eventName, id) { return removeMapStateListener(this, eventName, id); }

			/** Отображение строки текущего положения карты
			* @function
			* @memberOf api - перегружаемый внешними плагинами
			* @param {object['div']} элемент DOM модели для отображения строки, где будет показываться текущее положение карты
			* @param {object['screenGeometry']} геометрия видимой части экрана
			* @param {object['properties']} свойства карты
			* @see <a href="http://mapstest.kosmosnimki.ru/api/ex_locationTitleDiv.html">» Пример использования</a>.
			* @author <a href="mailto:saleks@scanex.ru">Sergey Alexseev</a>
			*/
			map.setLocationTitleDiv = null;
			var locationTitleDiv = gmxAPI.newElement(
				"div",
				{
				},
				{
				}
			);
			div.appendChild(locationTitleDiv);


			var coordinatesAttr = {
				'x': '27px'						// отступ по горизонтали
				,'y': '25px'					// по вертикали
				,'x1': '5px'					// отступ по горизонтали иконки смены формата координат
				,'scaleBar': {
					'bottom': {
						'x': '27px'				// отступ по горизонтали для scaleBar
						,'y': '47px'			// по вертикали
					}
					,'top': {
						'x': '27px'				// отступ по горизонтали для scaleBar
						,'y': '3px'				// по вертикали
					}
				}
			};

			var scaleBar = gmxAPI.newStyledDiv({
				position: "absolute",
				right: coordinatesAttr['scaleBar']['bottom']['x'],
				bottom: coordinatesAttr['scaleBar']['bottom']['y'],
				textAlign: "center"
			});
			scaleBar.className = "gmx_scaleBar";
			div.appendChild(scaleBar);
			
			map.scaleBar = { setVisible: function(flag) { gmxAPI.setVisible(scaleBar, flag); } };
			var scaleBarText, scaleBarWidth;
			var repaintScaleBar = function()
			{
				if (scaleBarText)
				{
					gmxAPI.size(scaleBar, scaleBarWidth, 16);
					scaleBar.innerHTML = scaleBarText;
				}
			}
			var coordinates = gmxAPI.newElement(
				"div",
				{
					className: "gmx_coordinates",
					onclick: function()
					{
						if (coordFormat > 2) return; //выдаем окошко с координатами только для стандартных форматов.
						var oldText = getCoordinatesText();
						var text = window.prompt(gmxAPI.KOSMOSNIMKI_LOCALIZED("Текущие координаты центра карты:", "Current center coordinates:"), oldText);
						if (text && (text != oldText))
							map.moveToCoordinates(text);
					}
				},
				{
					position: "absolute",
					right: coordinatesAttr['x'],
					bottom: coordinatesAttr['y'],
					cursor: "pointer"
				}
			);
			div.appendChild(coordinates);

			var getCoordinatesText = function(currPosition)
			{
				if(!currPosition) currPosition = map.getPosition();
				var x = gmxAPI.from_merc_x(currPosition['x']);
				var y = gmxAPI.from_merc_y(currPosition['y']);
				if (x > 180)
					x -= 360;
				if (x < -180)
					x += 360;
				x = gmxAPI.merc_x(x);
				y = gmxAPI.merc_y(y);
				if (coordFormat%3 == 0)
					return gmxAPI.formatCoordinates(x, y);
				else if (coordFormat%3 == 1)
					return gmxAPI.formatCoordinates2(x, y);
				else
					return Math.round(x) + ", " + Math.round(y);
			}

			var clearCoordinates = function()
			{
				for (var i = 0; i < coordinates.childNodes.length; i++)
					coordinates.removeChild(coordinates.childNodes[i]);
			}

			var coordFormatCallbacks = [		// методы формирования форматов координат
				function() { coordinates.innerHTML = getCoordinatesText(); },
				function() { coordinates.innerHTML = getCoordinatesText(); },
				function() { coordinates.innerHTML = getCoordinatesText(); },
			]; 

			var setCoordinatesFormat = function(num)
			{
				if(!num) num = coordFormat;
				if(num < 0) num = coordFormatCallbacks.length - 1;
				else if(num >= coordFormatCallbacks.length) num = 0;
				coordFormat = num;
				//coordinates.innerHTML = '';
				var attr = {'screenGeometry': map.getScreenGeometry(), 'properties': map.properties };
				coordFormatCallbacks[coordFormat](coordinates, attr);
				//coordinates.innerHTML = getCoordinatesText();
				gmxAPI._listeners.chkListeners('onSetCoordinatesFormat', map, coordFormat);
			}

			var coordFormat = 0;
			var changeCoords = gmxAPI.newElement(
				"img", 
				{ 
					className: "gmx_changeCoords",
					src: apiBase + "img/coord_reload.png",
					title: gmxAPI.KOSMOSNIMKI_LOCALIZED("Сменить формат координат", "Toggle coordinates format"),
					onclick: function()
					{
						coordFormat += 1;
						setCoordinatesFormat(coordFormat);
					}
				},
				{
					position: "absolute",
					right: coordinatesAttr['x1'],
					bottom: coordinatesAttr['y'],
					cursor: "pointer"
				}
			);
			div.appendChild(changeCoords);

			map.coordinates = {
				setVisible: function(flag) 
				{ 
					gmxAPI.setVisible(coordinates, flag); 
					gmxAPI.setVisible(changeCoords, flag); 
				}
				,
				addCoordinatesFormat: function(func) 
				{ 
					coordFormatCallbacks.push(func);
					return coordFormatCallbacks.length - 1;
				}
				,
				removeCoordinatesFormat: function(num) 
				{ 
					coordFormatCallbacks.splice(num, 1);
					return coordFormatCallbacks.length - 1;
				}
				,
				setFormat: setCoordinatesFormat
			}

			map.setCoordinatesAlign = function(attr) {			// Изменить позицию контейнера координат
				var align = attr['align'];
				if(align === 'br') {		// Позиция br(BottomRight)
					gmxAPI.setPositionStyle(coordinates, { 'top': '', 'bottom': coordinatesAttr['y'], 'right': coordinatesAttr['x'], 'left': '' });
					gmxAPI.setPositionStyle(changeCoords, { 'top': '', 'bottom': coordinatesAttr['y'], 'right': coordinatesAttr['x1'], 'left': '' });
					gmxAPI.setPositionStyle(scaleBar, { 'top': '', 'bottom': coordinatesAttr['scaleBar']['bottom']['y'], 'right': coordinatesAttr['scaleBar']['bottom']['x'], 'left': '' });
				} else if(align === 'bl') {		// Позиция bl(BottomLeft)
					gmxAPI.setPositionStyle(coordinates, { 'top': '', 'bottom': coordinatesAttr['y'], 'right': '', 'left': coordinatesAttr['x'] });
					gmxAPI.setPositionStyle(changeCoords, { 'top': '', 'bottom': coordinatesAttr['y'], 'right': '', 'left': coordinatesAttr['x1'] });
					gmxAPI.setPositionStyle(scaleBar, { 'top': '', 'bottom': coordinatesAttr['scaleBar']['bottom']['y'], 'right': '', 'left': coordinatesAttr['scaleBar']['bottom']['x'] });
				} else if(align === 'tr') {		// Позиция tr(TopRight)
					gmxAPI.setPositionStyle(coordinates, { 'top': coordinatesAttr['y'], 'bottom': '', 'right': coordinatesAttr['x'], 'left': '' });
					gmxAPI.setPositionStyle(changeCoords, { 'top': coordinatesAttr['y'], 'bottom': '', 'right': coordinatesAttr['x1'], 'left': '' });
					gmxAPI.setPositionStyle(scaleBar, { 'top': coordinatesAttr['scaleBar']['top']['y'], 'bottom': '', 'right': coordinatesAttr['scaleBar']['top']['x'], 'left': '' });
				} else if(align === 'tl') {		// Позиция tl(TopLeft)
					gmxAPI.setPositionStyle(coordinates, { 'top': coordinatesAttr['y'], 'bottom': '', 'right': '', 'left': coordinatesAttr['x'] });
					gmxAPI.setPositionStyle(changeCoords, { 'top': coordinatesAttr['y'], 'bottom': '', 'right': '', 'left': coordinatesAttr['x1'] });
					gmxAPI.setPositionStyle(scaleBar, { 'top': coordinatesAttr['scaleBar']['top']['y'], 'bottom': '', 'right': '', 'left': coordinatesAttr['scaleBar']['top']['x'] });
				}
			}

			// Begin: Блок управления копирайтами
			var copyrightAttr = {
				'x': '26px'					// отступ по горизонтали
				,'y': '7px'					// отступ по вертикали
			};
			var copyright = gmxAPI.newElement(
				"span",
				{
					className: "gmx_copyright"
				},
				{
					position: "absolute",
					right: copyrightAttr['x'],
					bottom: copyrightAttr['y']
				}
			);
			var copyrightAlign = '';
			div.appendChild(copyright);
			// Изменить позицию контейнера копирайтов
			map.setCopyrightAlign = function(attr) {
				if(attr['align']) {
					copyrightAlign = attr['align'];
				}
				copyrightPosition();
			}
			var copyrightedObjects = [];
			map.addCopyrightedObject = function(obj)
			{
				var exists = false;
				for (var i = 0; i < copyrightedObjects.length; i++)
					if (copyrightedObjects[i] == obj)
					{
						exists = true;
						break;
					}
					
				if (!exists)
				{
					copyrightedObjects.push(obj);
					map.updateCopyright();
				}
				
			}
			map.removeCopyrightedObject = function(obj)
			{
				var foundID = -1;
				for (var i = 0; i < copyrightedObjects.length; i++)
					if (copyrightedObjects[i] == obj)
					{
						foundID = i;
						break;
					}
					
				if ( foundID >= 0 )
				{
					copyrightedObjects.splice(foundID, 1);
					map.updateCopyright();
				}
					
				
			}
			
			var copyrightUpdateTimeout = false;
			var copyrightLastAlign = null;

			// Изменить координаты HTML элемента
			function copyrightPosition()
			{
				var center = (div.clientWidth - copyright.clientWidth) / 2;
				if(copyrightLastAlign != copyrightAlign) {
					copyrightLastAlign = copyrightAlign;
					if(copyrightAlign === 'bc') {				// Позиция bc(BottomCenter)
						gmxAPI.setPositionStyle(copyright, { 'top': '', 'bottom': copyrightAttr['y'], 'right': '', 'left': center + 'px' });
					} else if(copyrightAlign === 'br') {		// Позиция br(BottomRight)
						gmxAPI.setPositionStyle(copyright, { 'top': '', 'bottom': copyrightAttr['y'], 'right': copyrightAttr['x'], 'left': '' });
					} else if(copyrightAlign === 'bl') {		// Позиция bl(BottomLeft)
						gmxAPI.setPositionStyle(copyright, { 'top': '', 'bottom': copyrightAttr['y'], 'right': '', 'left': copyrightAttr['x'] });
					} else if(copyrightAlign === 'tc') {		// Позиция tc(TopCenter)
						gmxAPI.setPositionStyle(copyright, { 'top': '0px', 'bottom': '', 'right': '', 'left': center + 'px' });
					} else if(copyrightAlign === 'tr') {		// Позиция tr(TopRight)
						gmxAPI.setPositionStyle(copyright, { 'top': '0px', 'bottom': '', 'right': copyrightAttr['x'], 'left': '' });
					} else if(copyrightAlign === 'tl') {		// Позиция tl(TopLeft)
						gmxAPI.setPositionStyle(copyright, { 'top': '0px', 'bottom': '', 'right': '', 'left': copyrightAttr['x'] });
					}
				}
			}

			map.updateCopyright = function()
			{
				if (!copyrightUpdateTimeout)
				{
					copyrightUpdateTimeout = setTimeout(function()
					{
						var currPosition = map.getPosition();
						var x = gmxAPI.from_merc_x(currPosition['x']);
						var y = gmxAPI.from_merc_y(currPosition['y']);
						var texts = {};
						for (var i = 0; i < copyrightedObjects.length; i++)
						{
							var obj = copyrightedObjects[i];
							if (obj.copyright && obj.objectId && obj.getVisibility())
							{
								if (obj.geometry)
								{
									var bounds = gmxAPI.getBounds(obj.geometry.coordinates);
									if ((x < bounds.minX) || (x > bounds.maxX) || (y < bounds.minY) || (y > bounds.maxY))
										continue;
								}
								texts[obj.copyright] = true;
							}
						}
						
						//первым всегда будет располагаться копирайт СканЭкс. 
						//Если реализовать возможность задавать порядок отображения копирайтов, можно тоже самое сделать более культурно...
						var text = "<a target='_blank' style='color: inherit;' href='http://maps.kosmosnimki.ru/Apikey/License.html'>&copy; 2007-2011 " + gmxAPI.KOSMOSNIMKI_LOCALIZED("&laquo;СканЭкс&raquo;", "RDC ScanEx") + "</a>";
						
						for (var key in texts)
						{
							if (text != "")
								text += " ";
							text += key.split("<a").join("<a target='_blank' style='color: inherit;'");
						}
						copyright.innerHTML = text;
						copyrightUpdateTimeout = false;
						if(copyrightAlign) {
							copyrightPosition();
						}
					}, 0);
				}
			}
			// End: Блок управления копирайтами

			var sunscreen = map.addObject();
			gmxAPI._sunscreen = sunscreen;
			sunscreen.setStyle({ fill: { color: 0xffffff, opacity: 1 } });
			sunscreen.setRectangle(-180, -85, 180, 85);
			sunscreen.setVisible(false);

			var miniMapBorderWidth = 5;
			var miniMapLeftBorder = gmxAPI.newStyledDiv({
				position: "absolute",
				top: 0,
				width: miniMapBorderWidth + "px",
				backgroundColor: "#216B9C",
				opacity: 0.5
			});
			var miniMapBottomBorder = gmxAPI.newStyledDiv({
				position: "absolute",
				right: 0,
				height: miniMapBorderWidth + "px",
				backgroundColor: "#216B9C",
				opacity: 0.5,
				fontSize: 0
			});
			div.appendChild(miniMapLeftBorder);
			div.appendChild(miniMapBottomBorder);
			var repaintMiniMapBorders = function()
			{
				gmxAPI.setVisible(miniMapLeftBorder, miniMapAvailable && miniMapShown);
				gmxAPI.setVisible(miniMapBottomBorder, miniMapAvailable && miniMapShown);
			}
			var miniMapFrame = gmxAPI.newStyledDiv({
				position: "absolute",
				backgroundColor: "#216b9c",
				opacity: 0.2
			});
			miniMapFrame.onmousedown = function(event)
			{
				var startMouseX = gmxAPI.eventX(event);
				var startMouseY = gmxAPI.eventY(event);
				
				var currPosition = map.getPosition();
				var startMapX = currPosition['x'];
				var startMapY = currPosition['y'];

				var scale = gmxAPI.getScale(miniMapZ);
				
				var mouseMoveMode = new HandlerMode(document.documentElement, "mousemove", function(event)
				{
					map.moveTo(
						gmxAPI.from_merc_x(startMapX - (gmxAPI.eventX(event) - startMouseX)*scale), 
						gmxAPI.from_merc_y(startMapY + (gmxAPI.eventY(event) - startMouseY)*scale), 
						map.getZ()
					);
					return false;
				});
				var mouseUpMode = new HandlerMode(document.documentElement, "mouseup", function(event)
				{
					mouseMoveMode.clear();
					mouseUpMode.clear();
				});
				mouseMoveMode.set();
				mouseUpMode.set();
				return false;
			}
			div.appendChild(miniMapFrame);
			var repaintMiniMapFrame = function()
			{
				gmxAPI.setVisible(miniMapFrame, miniMapAvailable && miniMapShown);
				var scaleFactor = Math.pow(2, map.getZ() - miniMapZ);
				var w = div.clientWidth/scaleFactor;
				var h = div.clientHeight/scaleFactor;
				if ((w >= miniMapSize) || (h >= miniMapSize))
					gmxAPI.setVisible(miniMapFrame, false);
				else
				{
					var ww = (miniMapSize/2 - w/2);
					var hh = (miniMapSize/2 - h/2);
					var ph = { 'top': hh + 'px', 'bottom': '', 'right': ww + 'px', 'left': '' };	// Позиция миникарты по умолчанию tr(TopRight)
					if(miniMapAlign === 'br') {		// Позиция миникарты br(BottomRight)
						ph['left'] = ''; ph['right'] = ww + 'px';
						ph['bottom'] = hh + 'px';	ph['top'] = '';
					} else if(miniMapAlign === 'bl') {	// Позиция миникарты по умолчанию bl(BottomLeft)
						ph['left'] = ww + 'px';		ph['right'] = '';
						ph['bottom'] = hh + 'px';	ph['top'] = '';
					} else if(miniMapAlign === 'tl') {	// Позиция миникарты по умолчанию tl(TopLeft)
						ph['left'] = (miniMapSize/2 - w/2) + 'px'; ph['right'] = '';
					}
					gmxAPI.setPositionStyle(miniMapFrame, ph);
					gmxAPI.size(miniMapFrame, w, h);
				}
			}
			var miniMapZ = 0;
			var miniMapAvailable = false;
			var miniMapSize = 0;
			var miniMap = map.addMapWindow(function(z) 
			{ 
				miniMapZ = Math.max(minZoom, Math.min(maxRasterZoom, z + miniMapZoomDelta));
				try { repaintMiniMapFrame(); } catch (e) {
					gmxAPI.addDebugWarnings({'func': 'repaintMiniMapFrame', 'event': e});
				}
				return miniMapZ;
			});
			var miniMapShown = true;
			var miniMapToggler = gmxAPI.newElement(
				"img",
				{ 
					className: "gmx_miniMapToggler",
					src: apiBase + "img/close_map.png",
					title: gmxAPI.KOSMOSNIMKI_LOCALIZED("Показать/скрыть мини-карту", "Show/hide minimap"),
					onclick: function()
					{
						miniMapShown = !miniMapShown;
						miniMapToggler.src = apiBase + (miniMapShown ? "img/close_map_a.png" : "img/open_map_a.png");
						resizeMiniMap();
					},
					onmouseover: function()
					{
						miniMapToggler.src = apiBase + (miniMapShown ? "img/close_map_a.png" : "img/open_map_a.png");
					},
					onmouseout: function()
					{
						miniMapToggler.src = apiBase + (miniMapShown ? "img/close_map.png" : "img/open_map.png");
					}
				},
				{
					position: "absolute",
					right: 0,
					top: 0,
					cursor: "pointer"
				}
			);
			div.appendChild(miniMapToggler);

			var resizeMiniMap = function()
			{
				var w = div.clientWidth;
				var h = div.clientHeight;
				miniMapSize = (miniMapAvailable && miniMapShown) ? Math.round(w/7) : 0;
				miniMapLeftBorder.style.height = (miniMapSize + miniMapBorderWidth) + "px";
				miniMapBottomBorder.style.width = miniMapSize + "px";
				if(miniMapAlign === 'br') {			// Позиция миникарты br(BottomRight)
					miniMap.positionWindow((w - miniMapSize)/w, (h - miniMapSize)/h, 1, 1);
					gmxAPI.setPositionStyle(miniMapLeftBorder, { 'top': '', 'bottom': '0px', 'right': miniMapSize + 'px', 'left': '' });
					gmxAPI.setPositionStyle(miniMapBottomBorder, { 'top': '', 'bottom': miniMapSize + 'px', 'right': '0px', 'left': '' });
					gmxAPI.setPositionStyle(miniMapToggler, { 'top': '', 'bottom': '0px', 'right': '0px', 'left': '' });
				} else if(miniMapAlign === 'bl') {	// Позиция миникарты по умолчанию bl(BottomLeft)
					miniMap.positionWindow(0, (h - miniMapSize)/h, miniMapSize/w, 1);
					gmxAPI.setPositionStyle(miniMapLeftBorder, { 'top': '', 'bottom': '0px', 'right': '', 'left': miniMapSize + 'px' });
					gmxAPI.setPositionStyle(miniMapBottomBorder, { 'top': '', 'bottom': miniMapSize + 'px', 'right': '', 'left': '0px' });
					gmxAPI.setPositionStyle(miniMapToggler, { 'top': '', 'bottom': '0px', 'right': '', 'left': '0px' });
				} else if(miniMapAlign === 'tl') {	// Позиция миникарты по умолчанию tl(TopLeft)
					miniMap.positionWindow(0, 0, miniMapSize/w, miniMapSize/h);
					gmxAPI.setPositionStyle(miniMapLeftBorder, { 'top': '0px', 'bottom': '', 'right': '', 'left': miniMapSize + 'px' });
					gmxAPI.setPositionStyle(miniMapBottomBorder, { 'top': miniMapSize + 'px', 'bottom': '', 'right': '', 'left': '0px' });
					gmxAPI.setPositionStyle(miniMapToggler, { 'top': '0px', 'bottom': '', 'right': '', 'left': '0px' });
				} else {							// Позиция миникарты по умолчанию tr(TopRight)
					miniMap.positionWindow((w - miniMapSize)/w, 0, 1, miniMapSize/h);
					gmxAPI.setPositionStyle(miniMapLeftBorder, { 'top': '0px', 'bottom': '', 'right': miniMapSize + 'px', 'left': '' });
					gmxAPI.setPositionStyle(miniMapBottomBorder, { 'top': miniMapSize + 'px', 'bottom': '', 'right': '0px', 'left': '' });
					gmxAPI.setPositionStyle(miniMapToggler, { 'top': '0px', 'bottom': '', 'right': '0px', 'left': '' });
				}
				repaintMiniMapBorders();
				repaintMiniMapFrame();
			}

			miniMap.setVisible = function(flag) 
			{ 
				FlashMapObject.prototype.setVisible.call(miniMap, flag);
				miniMapAvailable = flag;
				gmxAPI.setVisible(miniMapFrame, flag);
				gmxAPI.setVisible(miniMapToggler, flag);
				resizeMiniMap();
			}
			map.miniMap = miniMap;
			miniMap.setVisible(false);
			var miniMapAlign = 'tr';
			// Изменить позицию miniMap
			map.setMiniMapAlign = function(attr) {
				if(attr['align']) miniMapAlign = attr['align'];
				resizeMiniMap();
			}

			var geomixerLink = gmxAPI.newElement(
				"a",
				{
					href: "http://kosmosnimki.ru/geomixer",
					target: "_blank",
					className: "gmx_geomixerLink"
				},
				{
					position: "absolute",
					left: "8px",
					bottom: "8px"
				}
			);
			geomixerLink.appendChild(gmxAPI.newElement(
				"img",
				{
					src: apiBase + "img/geomixer_logo_api.png",
					title: gmxAPI.KOSMOSNIMKI_LOCALIZED("© 2007-2011 ИТЦ «СканЭкс»", "(c) 2007-2011 RDC ScanEx"),
					width: 130,
					height: 34
				},
				{
					border: 0
				}
			));
			div.appendChild(geomixerLink);
			map.setGeomixerLinkAlign = function(attr) {				// Изменить позицию ссылки на Geomixer
				var align = attr['align'];
				if(align === 'br') {			// Позиция br(BottomRight)
					gmxAPI.setPositionStyle(geomixerLink, { 'top': '', 'bottom': '8px', 'right': '8px', 'left': '' });
				} else if(align === 'bl') {		// Позиция bl(BottomLeft)
					gmxAPI.setPositionStyle(geomixerLink, { 'top': '', 'bottom': '8px', 'right': '', 'left': '8px' });
				} else if(align === 'tr') {		// Позиция tr(TopRight)
					gmxAPI.setPositionStyle(geomixerLink, { 'top': '8px', 'bottom': '', 'right': '8px', 'left': '' });
				} else if(align === 'tl') {		// Позиция tl(TopLeft)
					gmxAPI.setPositionStyle(geomixerLink, { 'top': '8px', 'bottom': '', 'right': '', 'left': '8px' });
				}
			}

			sunscreen.setHandler("onResize", resizeMiniMap);

			var copyrightUpdateTimeout2 = false;
			var updatePosition = function()
			{
				var currPosition = map.getPosition();
				gmxAPI.currPosition = currPosition;

				var z = currPosition['z'];
				if (z == Math.round(z))
				{
					var metersPerPixel = getLocalScale(gmxAPI.from_merc_x(currPosition['x']), gmxAPI.from_merc_y(currPosition['y']))*gmxAPI.getScale(z);
					for (var i = 0; i < 30; i++)
					{
						var distance = [1, 2, 5][i%3]*Math.pow(10, Math.floor(i/3));
						var w = distance/metersPerPixel;
						if (w > 100)
						{
							var name = gmxAPI.prettifyDistance(distance);
							if ((name != scaleBarText) || (w != scaleBarWidth))
							{
								scaleBarText = name;
								scaleBarWidth = w;
								repaintScaleBar();
							}
							break;
						}
					}
				}
				var newZoomObj = zoomArr[Math.round(z) - minZoom];
				if (newZoomObj != zoomObj)
				{
					if (zoomObj)
						zoomObj.src = apiBase + "img/zoom_raw.png";
					zoomObj = newZoomObj;
					zoomObj.src = apiBase + "img/zoom_active.png";
				}
				setCoordinatesFormat();
				//coordinates.innerHTML = getCoordinatesText(currPosition);

				/** Пользовательское событие positionChanged
				* @function callback
				* @param {object} атрибуты прослушивателя
				*/
				if ('stateListeners' in map && 'positionChanged' in map.stateListeners) {
					var attr = {'div': locationTitleDiv, 'screenGeometry': map.getScreenGeometry(), 'properties': map.properties };
					gmxAPI._listeners.chkListeners('positionChanged', map, attr);
				}

				if (copyrightUpdateTimeout2)
					clearTimeout(copyrightUpdateTimeout2);
				copyrightUpdateTimeout2 = setTimeout(function()
				{
					map.updateCopyright();
					copyrightUpdateTimeout2 = false;
				}, 250);
			}
			var eventMapObject = map.addObject();
			eventMapObject.setHandler("onMove", updatePosition);
			// onMoveBegin	- перед onMove
			// onMoveEnd	- после onMove

			updatePosition();

			map.setBackgroundColor(0x000001);
			miniMap.setBackgroundColor(0xffffff);

			map.defaultHostName = layers.properties.hostName;
			map.addLayers(layers);

			var startDrag = function(object, dragCallback, upCallback)
			{
				map.freeze();
				sunscreen.setVisible(true);
				setToolHandlers({
					onMouseMove: function(o)
					{
						var currPosition = map.getPosition();
						var mouseX = gmxAPI.from_merc_x(currPosition['mouseX']);
						var mouseY = gmxAPI.from_merc_y(currPosition['mouseY']);
						dragCallback(mouseX, mouseY, o);
					},
					onMouseUp: function()
					{
						stopDrag();
						if (upCallback)
							upCallback();
					}
				});
			}
			gmxAPI._startDrag = startDrag;

			var stopDrag = function()
			{
				setToolHandlers({ onMouseMove: null, onMouseUp: null });
				map.unfreeze();
				sunscreen.setVisible(false);
			}
			gmxAPI._stopDrag = stopDrag;

			FlashMapObject.prototype.startDrag = function(dragCallback, upCallback)
			{
				startDrag(this, dragCallback, upCallback);
			}

			FlashMapObject.prototype.enableDragging = function(dragCallback, downCallback, upCallback)
			{
				var object = this;
				var mouseDownHandler = function(o)
				{
					if (downCallback) {
						var currPosition = map.getPosition();
						var mouseX = gmxAPI.from_merc_x(currPosition['mouseX']);
						var mouseY = gmxAPI.from_merc_y(currPosition['mouseY']);
						downCallback(mouseX, mouseY, o);
					}
					startDrag(object, dragCallback, upCallback);
				}
				if (object == map) {
					setToolHandler("onMouseDown", mouseDownHandler);
				} else {
					object.setHandler("onMouseDown", mouseDownHandler);
				}
			}

			window.kosmosnimkiBeginZoom = function() 
			{
				if (activeToolName != "move")
					return false;
				map.freeze();
				sunscreen.setVisible(true);
				var x1 = map.getMouseX();
				var y1 = map.getMouseY();
				var x2, y2;
				var rect = map.addObject();
				rect.setStyle({ outline: { color: 0xa0a0a0, thickness: 1, opacity: 70 } });
				setToolHandlers({
					onMouseMove: function()
					{
						x2 = map.getMouseX();
						y2 = map.getMouseY();
						rect.setRectangle(x1, y1, x2, y2);
					},
					onMouseUp: function()
					{
						setToolHandlers({ onMouseMove: null, onMouseUp: null });
						map.unfreeze();
						sunscreen.setVisible(false);
						var d = 10*gmxAPI.getScale(map.getZ());
						if (!x1 || !x2 || !y1 || !y2 || ((Math.abs(gmxAPI.merc_x(x1) - gmxAPI.merc_x(x2)) < d) && (Math.abs(gmxAPI.merc_y(y1) - gmxAPI.merc_y(y2)) < d)))
							map.zoomBy(1, true);
						else
							map.zoomToExtent(Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2));
						rect.remove();
					}
				});
				return true;
			}

			var onWheel = function(e)
			{
				if (!e)
					e = window.event;
	
				var inMap = false;
				var elem = gmxAPI.compatTarget(e);
				while(elem != null) 
				{
					if (elem == div)
					{
				                inMap = true;
				                break;
					}
					elem = elem.parentNode;
				}
		
				if (!inMap)
					return;

				var delta = 0;
				if (e.wheelDelta) 
					delta = e.wheelDelta/120; 
				else if (e.detail) 
					delta = -e.detail/3;
	
				if (delta)
					map.zoomBy(delta > 0 ? 1 : -1, true);

				if (e.preventDefault)
				{
					e.stopPropagation();
					e.preventDefault();
				}
				else 
				{
					e.returnValue = false;
					e.cancelBubble = true;
				}
			}

			var addHandler = function(div, eventName, handler)
			{
				if (div.attachEvent) 
					div.attachEvent("on" + eventName, handler); 
				if (div.addEventListener) 
					div.addEventListener(eventName, handler, false);
			}

			addHandler(window, "mousewheel", onWheel);
			addHandler(document, "mousewheel", onWheel);
			if (window.addEventListener)
				window.addEventListener('DOMMouseScroll', onWheel, false);

			FlashMapObject.prototype.loadGML = function(url, func)
			{
				var me = this;
				var _hostname = getAPIHostRoot() + "ApiSave.ashx?get=" + encodeURIComponent(url);
				sendCrossDomainJSONRequest(_hostname, function(response)
				{
					if(typeof(response) != 'object' || response['Status'] != 'ok') {
						gmxAPI.addDebugWarnings({'_hostname': _hostname, 'url': url, 'Error': 'bad response'});
						return;
					}
					var geometries = gmxAPI.parseGML(response['Result']);
					for (var i = 0; i < geometries.length; i++)
						me.addObject(geometries[i], null);
					if (func)
						func();
				})
			}
			FlashMapObject.prototype.loadWFS = FlashMapObject.prototype.loadGML;

            /** Заружает WMS слои как подъобъекты данного объекта. Слои добавляются невидимыми
                @param url {string} - URL WMS сервера
                @param func {function} - ф-ция, которая будет вызвана когда WMS слои добавятся на карту.
            */
			FlashMapObject.prototype.loadWMS = function(url, func)
			{
                gmxAPI._loadWMS(map, this, url, func);
			}

			FlashMapObject.prototype.loadMap = function(arg1, arg2, arg3)
			{
				var hostName = map.defaultHostName;
				var mapName = null;
				var callback = null;
				if (arg3)
				{
					hostName = arg1;
					mapName = arg2;
					callback = arg3;
				}
				else if (arg2)
				{
					if (typeof(arg2) == 'function')
					{
						mapName = arg1;
						callback = arg2;
					}
					else
					{
						hostName = arg1;
						mapName = arg2;
					}
				}
				else
					mapName = arg1;
				var me = this;
				loadMapJSON(hostName, mapName, function(layers)
				{
					me.addLayers(layers);
					if (callback)
						callback();
				});
			}

			var gplForm = false;
			FlashMapObject.prototype.loadObjects = function(url, callback)
			{
				var _hostname = getAPIHostRoot() + "ApiSave.ashx?get=" + encodeURIComponent(url);
				sendCrossDomainJSONRequest(_hostname, function(response)
				{
					if(typeof(response) != 'object' || response['Status'] != 'ok') {
						gmxAPI.addDebugWarnings({'_hostname': _hostname, 'url': url, 'Error': 'bad response'});
						return;
					}
					var geometries = gmxAPI.parseGML(response['Result']);
					callback(geometries);
				})
			}
			FlashMapObject.prototype.saveObjects = function(geometries, fileName, format)
			{
				var inputName, inputText;
				if (!gplForm)
				{
					gplForm = document.createElement('<form>'),
					inputName = document.createElement('<input>'),
					inputText = document.createElement('<input>');
				}
				else
				{
					gplForm = $('download_gpl_form'),
					inputName = gplForm.firstChild,
					inputText = gplForm.lastChild;
				}
	
				gplForm.setAttribute('method', 'post');
				var _hostname = getAPIHostRoot();
				gplForm.setAttribute('action', _hostname + 'ApiSave.ashx');
				gplForm.style.display = 'none';
				inputName.value = fileName;
				inputName.setAttribute('name', 'name')
				if (!format)
					format = "gml";
				inputText.value = gmxAPI.createGML(geometries, format.toLowerCase());
				inputText.setAttribute('name', 'text')
	
				gplForm.appendChild(inputName);
				gplForm.appendChild(inputText);
	
				document.body.appendChild(gplForm);
	
				gplForm.submit();
			}
			
			FlashMapObject.prototype.zoomBy = function(dz, useMouse) {
				gmxAPI._listeners.chkListeners('zoomBy', map);			// Проверка map Listeners на zoomBy
				gmxAPI._cmdProxy('zoomBy', { 'attr': {'dz':-dz, 'useMouse':useMouse} });
			}

			if (callback)
				callback(map);

			initialLayersAdded = true;

		} catch (e) {
			var err = '';
			if(e.lineNumber) {
				err += 'api.js Line: ' + e.lineNumber + '\n' + e;
			}
			else {
				err += e + '\n';
			}
			gmxAPI.addDebugWarnings({'event': e, 'alert': err});
			//alert(err);
		}
	}

	var o = gmxAPI._addSWFObject(apiBase + "api.swf?" + Math.random(), flashId, "100%", "100%", "10", "#ffffff", loadCallback, window.gmxFlashLSO);
	o.write(div);

	return true;
}

window.createFlashMapInternal = createFlashMapInternal;

})();

function createKosmosnimkiMapInternal(div, layers, callback)
{
	var oldGetLayers = window.getLayers;
	var finish = function()
	{
		loadMapJSON(
			gmxAPI.getBaseMapParam("hostName", "maps.kosmosnimki.ru"), 
			gmxAPI.getBaseMapParam("id", kosmosnimki_API), 
			function(kosmoLayers)
			{
				createFlashMapInternal(div, kosmoLayers, function(map)
				{
					for (var i = 0; i < map.layers.length; i++) {
						var obj = map.layers[i];
						obj.setVisible(false);
					}
					var mapString = KOSMOSNIMKI_LOCALIZED("Карта", "Map");
					var satelliteString = KOSMOSNIMKI_LOCALIZED("Снимки", "Satellite");
					var hybridString = KOSMOSNIMKI_LOCALIZED("Гибрид", "Hybrid");

					var baseLayerTypes = {
						'map': {
							'onClick': function() { gmxAPI.map.setBaseLayer(mapString); },
							'onCancel': function() { gmxAPI.map.unSetBaseLayer(); },
							'onmouseover': function() { this.style.color = "orange"; },
							'onmouseout': function() { this.style.color = "white"; },
							'hint': gmxAPI.KOSMOSNIMKI_LOCALIZED("Карта", "Map")
						}
						,
						'satellite': {
							'onClick': function() { gmxAPI.map.setBaseLayer(satelliteString); },
							'onCancel': function() { gmxAPI.map.unSetBaseLayer(); },
							'onmouseover': function() { this.style.color = "orange"; },
							'onmouseout': function() { this.style.color = "white"; },
							'hint': gmxAPI.KOSMOSNIMKI_LOCALIZED("Снимки", "Satellite")
						}
						,
						'hybrid': {
							'onClick': function() { gmxAPI.map.setBaseLayer(hybridString); },
							'onCancel': function() { gmxAPI.map.unSetBaseLayer(); },
							'onmouseover': function() { this.style.color = "orange"; },
							'onmouseout': function() { this.style.color = "white"; },
							'hint': gmxAPI.KOSMOSNIMKI_LOCALIZED("Гибрид", "Hybrid")
						}
					};
					
					var mapLayers = [];
					var mapLayerID = gmxAPI.getBaseMapParam("mapLayerID", "");
					if(typeof(mapLayerID) == 'string') {
						var mapLayerNames = mapLayerID.split(',');
						for (var i = 0; i < mapLayerNames.length; i++)
							if (mapLayerNames[i] in map.layers)
							{
								var mapLayer = map.layers[mapLayerNames[i]];
								//mapLayer.setVisible(true);						// Слои BaseMap должны быть видимыми
								mapLayer.setAsBaseLayer(mapString, baseLayerTypes['map']);
								mapLayer.setBackgroundColor(0xffffff);
								mapLayers.push(mapLayer);
							}
					}
					var satelliteLayers = [];
					var satelliteLayerID = gmxAPI.getBaseMapParam("satelliteLayerID", "");
					if(typeof(satelliteLayerID) == 'string') {
						var satelliteLayerNames = satelliteLayerID.split(",");
						
						for (var i = 0; i < satelliteLayerNames.length; i++)
							if (satelliteLayerNames[i] in map.layers)
								satelliteLayers.push(map.layers[satelliteLayerNames[i]]);
								
						for (var i = 0; i < satelliteLayers.length; i++)
						{
							satelliteLayers[i].setAsBaseLayer(satelliteString, baseLayerTypes['satellite'])
							satelliteLayers[i].setBackgroundColor(0x000001);
						}
					}
					
					var isAnyExists = false;
					var overlayLayers = [];
					var overlayLayerID = gmxAPI.getBaseMapParam("overlayLayerID", "");
					if(typeof(overlayLayerID) == 'string') {
						var overlayLayerNames = overlayLayerID.split(',');
						for (var i = 0; i < overlayLayerNames.length; i++)
							if (overlayLayerNames[i] in map.layers)
							{
								isAnyExists = true;
								var overlayLayer = map.layers[overlayLayerNames[i]];
								overlayLayer.setAsBaseLayer(hybridString, baseLayerTypes['hybrid']);
								overlayLayers.push(overlayLayer);
							}
						
						if (isAnyExists)
						{
							for (var i = 0; i < satelliteLayers.length; i++)
								satelliteLayers[i].setAsBaseLayer(hybridString, baseLayerTypes['hybrid']);						
						}
					}
					
					var setOSMEmbed = function(layer)
					{
						layer.enableTiledQuicklooksEx(function(o, image)
						{
							image.setOSMTiles(true);
							//image.setCopyright("<a href='http://openstreetmap.org'>&copy; OpenStreetMap</a>, <a href='http://creativecommons.org/licenses/by-sa/2.0/'>CC-BY-SA</a>");
							image.setZoomBounds(parseInt(o.properties["text"]), 18);
						}, 10, 18);
					}
					
					var osmEmbedID = gmxAPI.getBaseMapParam("osmEmbedID", "");
					if(typeof(osmEmbedID) != 'string') osmEmbedID = "06666F91C6A2419594F41BDF2B80170F";
					var osmEmbed = map.layers[osmEmbedID];
					if (osmEmbed)
					{
						osmEmbed.setAsBaseLayer(mapString);
						setOSMEmbed(osmEmbed);
					}

					var setCopyright = function(o, z1, z2, text)
					{
						var c = o.addObject();
						c.setZoomBounds(z1, z2);
						c.setCopyright(text);
						return c;
					}

					if (mapLayers.length > 0)
					{
						setCopyright(
							mapLayers[0], 
							1, 
							9, 
							"<a href='http://www.bartholomewmaps.com/'>&copy; Collins Bartholomew</a>"
						);

						var obj = setCopyright(
							mapLayers[0],
							10,
							20,
							"<a href='http://www.geocenter-consulting.ru/'>&copy; " + gmxAPI.KOSMOSNIMKI_LOCALIZED("ЗАО &laquo;Геоцентр-Консалтинг&raquo;", "Geocentre Consulting") + "</a>"
						);
						obj.geometry = { type: "LINESTRING", coordinates: [29, 40, 180, 80] };
					}
					
					//те же копирайты, что и для карт
					if (overlayLayers.length > 0)
					{
						setCopyright(
								overlayLayers[0], 
								1, 
								9, 
								"<a href='http://www.bartholomewmaps.com/'>&copy; Collins Bartholomew</a>"
						);
						
						var obj = setCopyright(
							overlayLayers[0],
							10,
							20,
							"<a href='http://www.geocenter-consulting.ru/'>&copy; " + gmxAPI.KOSMOSNIMKI_LOCALIZED("ЗАО &laquo;Геоцентр-Консалтинг&raquo;", "Geocentre Consulting") + "</a>"
						);
						
						obj.geometry = { type: "LINESTRING", coordinates: [29, 40, 180, 80] };
					}


					if ( satelliteLayers.length > 0 )
					{
						setCopyright(
							satelliteLayers[0],
							1,
							5,
							"<a href='http://www.nasa.gov'>&copy; NASA</a>"
						);

						setCopyright(
							satelliteLayers[0],
							6,
							13,
							"<a href='http://www.es-geo.com'>&copy; Earthstar Geographics</a>"
						);

						var obj = setCopyright(
							satelliteLayers[0],
							6,
							14,
							"<a href='http://www.antrix.gov.in/'>&copy; ANTRIX</a>"
						);
						obj.geometry = gmxAPI.from_merc_geometry({ type: "LINESTRING", coordinates: [1107542, 2054627, 5048513, 8649003] });

						setCopyright(
							satelliteLayers[0],
							9,
							17,
							"<a href='http://www.geoeye.com'>&copy; GeoEye Inc.</a>"
						);
					}

					var currentMode = false;
					map.getMode = function()
					{ 
						return map.toolsAll.baseLayersTools.activeToolName;
					}
					map.setMode = function(mode) 
					{
						var name = { map: mapString, satellite: satelliteString, hybrid: hybridString }[mode];
						map.setBaseLayer(name);
						map.toolsAll.baseLayersTools.selectTool(name);
					}
					map.setMode(mapLayers.length > 0 ? "map" : "satellite");
					map.miniMap.setVisible(true);
					
					for (var m = 0; m < mapLayers.length; m++)
						map.miniMap.addLayer(mapLayers[m]);
					
					if (osmEmbed)
					{
						map.miniMap.addLayer(osmEmbed);
						setOSMEmbed(map.miniMap.layers[osmEmbed.properties.name]);
					}
		                
					if (!window.baseMap || !window.baseMap.hostName || (window.baseMap.hostName == "maps.kosmosnimki.ru"))
						map.geoSearchAPIRoot = typeof window.searchAddressHost !== 'undefined' ? window.searchAddressHost : "http://maps.kosmosnimki.ru/";
		
					if (layers)
					{
						map.defaultHostName = layers.properties.hostName;
						window.getLayers = function() { return layers; }
						map.addLayers(layers);
						map.properties = layers.properties;
					}

					callback(map);		// Вызов HTML маплета
				});
			},
			function()
			{
				window.getLayers = oldGetLayers;
				createFlashMapInternal(div, layers, callback);
			}
		);
	}

	if (!gmxAPI.getScriptURL("config.js"))
	{
		gmxAPI.loadVariableFromScript(
			gmxAPI.getScriptBase("api.js") + "config.js",
			"baseMap",
			finish,
			finish			// Нет config.js
		);
	}
	else
		finish();
};
