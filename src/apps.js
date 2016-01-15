var game;
var $$ = {};
$$.extend = function (a, b) {
    if (typeof b === "undefined") {
        return a;
    }
    for (var i in a) {
        if (!b[i])
            b[i] = a[i];
    }
    return b;
}
function initGame() {
    game = new MainScene();
    PlayerData.init();
}

function showCover() {
    var scene = ccs.csLoader.createNode(res.cover_scene_json);

    var loginBtn = scene.getChildByName("root").getChildByName("cover_login_btn");
    bindButtonCallback(loginBtn, function () {
        initDatas();
        initGame();
        showGame();
    });
    cc.director.runScene(scene);
}
function showGame() {
    cc.director.runScene(game);
}

function bindButtonCallback(button, callback) {
    button.addTouchEventListener(function (sender, type) {
        switch (type) {
            case ccui.Widget.TOUCH_ENDED:
                callback.call(sender);
                break;
        }
    }, button);
}

function removeCCSAnimationDefaultTween(timelines) {
    for (var i in timelines) {
        var timeline = timelines[i];
        var frames = timeline.getFrames();
        for (var j in frames) {
            var frame = frames[j];
            if (frame.isTween()) {
                frame.setTween(false);
            }
        }
    }
}

function popup(popupMenu, localZOrder) {
    if (cc.director.getRunningScene()) {
        if (!cc.director.getRunningScene().getChildByName(popupMenu.getName())) {
            cc.director.getRunningScene().addChild(popupMenu, localZOrder);
        }
    }
}
