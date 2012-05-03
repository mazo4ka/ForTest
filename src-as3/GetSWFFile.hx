import flash.errors.Error;
import flash.net.URLRequest;
import flash.net.URLStream;
import flash.events.IOErrorEvent;
import flash.net.ObjectEncoding;
import flash.events.Event;

class GetSWFFile
{
	private var onLoad:Array<Dynamic>->Void;
	private var errorCallback:String->Void;
	private var url:String;
	private var stream:URLStream;
	
	public function new(url_:String, onLoad_:Array<Dynamic>->Void, errorCallback_:String->Void)
	{
		url = url_;
		onLoad = onLoad_;
		errorCallback = errorCallback_;
		init();
	}

	private function init()
	{
		if(Main.useFlashLSO) {
			var ret = Utils.readSharedObject(url);
			if(ret != null) {
				var arr:Array<Dynamic> = cast(ret);
				if(arr != null && arr.length > 0) {
					onLoad(arr);
					return; 
				}
			}
		}
		
		stream = new URLStream();
		stream.objectEncoding = ObjectEncoding.AMF3;
		stream.addEventListener(IOErrorEvent.IO_ERROR, onError);
		stream.addEventListener(Event.COMPLETE, onComplete);
		stream.load(new flash.net.URLRequest(url));
	}
	
	private function destructor(data:Array<Dynamic>)
	{
		stream.removeEventListener(IOErrorEvent.IO_ERROR, onError);
		stream.removeEventListener(Event.COMPLETE, onComplete);
		onLoad(data);
		if ( stream.connected ) stream.close();
		data = null;
		stream = null;
	}
	private function onError(event:IOErrorEvent)
	{
		//trace("error reading vector tile: " + url);
		destructor(null);
		if(errorCallback != null) errorCallback(url);
	}

	private function onComplete(event:Event)
	{
		var arr:Array<Dynamic> = [];
		try {
			arr = stream.readObject();
		} catch(e:Error) {
			//trace('File not found: ' + url);	// Скорее всего от сервера пришел статус ответа 200 вместо 404
		}

		if(Main.useFlashLSO && arr != null && arr.length > 0) {
			Utils.writeSharedObject(url, arr);
		}
		destructor(arr);
	}
}