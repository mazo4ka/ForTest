import flash.display.Sprite;
import flash.events.Event;
import flash.events.MouseEvent;

class MapContent
{
	public var mapNode:MapNode;
	public var contentSprite:Sprite;

	public function initialize(mapNode_:MapNode)
	{
		mapNode = mapNode_;
		contentSprite = createContentSprite();
		addHandlers();
	}

	public function createContentSprite():Sprite
	{
		trace("MapContent.createContentSprite must be overridden!");
		return null;
	}

	public function delClusters():Dynamic
	{
		return null;
	}

	public function setClusters(attr:Dynamic):Dynamic
	{
		return null;
	}

	public function repaint() 
	{
	}

	public function hasLabels():Bool
	{
		return false;
	}

	public function paintLabels()
	{
	}

	public function addHandlers()
	{
		var node = this.mapNode;
		contentSprite.addEventListener(MouseEvent.MOUSE_OVER, function(event:MouseEvent)
		{
			node.callHandler("onMouseOver");
		});
		contentSprite.addEventListener(MouseEvent.MOUSE_OUT, function(event:MouseEvent)
		{
			Main.chkEventAttr(event);
			node.callHandler("onMouseOut");
		});
		contentSprite.addEventListener(MouseEvent.MOUSE_MOVE, function(event:MouseEvent)
		{
			Main.chkEventAttr(event);
			node.callHandler("onMouseMove");
		});
		contentSprite.addEventListener(MouseEvent.MOUSE_DOWN, function(event:MouseEvent)
		{
			Main.registerMouseDown(node, event, null);
		});
	}
}