/**
 * Created by Administrator on 2016/4/20.
 */

var TaskPanel = cc.Class.extend({
    ctor: function () {
        this.layer = ccs.csLoader.createNode(res.task_layer_json);
        this.taskview = ccs.csLoader.createNode(res.task_view_json).getChildByName('root');
        this.rewardTip = ccs.csLoader.createNode(res.reward_tip_json).getChildByName('root');
        var root = this.layer.getChildByName('root');
        var tab = root.getChildByName('tab');
        var tabParams = [
            {name: "everyDay_tab"},
            {name: "achievement_tab"}
        ];
        var bar = root.getChildByName('bar');
        this.achevementBox = bar.getChildByName('achievementBox');
        this.everyDayBox = bar.getChildByName('everyDayBox');
        this._tabObj = {
            'everyDay_tab': {
                'box': this.everyDayBox,
                'loadingBar': this._refreshDailyTaskLiveness,
                'itemLoadingBar': function (item) {
                    var bar_purple = item.getChildByName('bar_purple');
                    var bar_green = item.getChildByName('bar_green');
                    bar_purple.setVisible(false);
                    bar_green.setVisible(true);
                    return bar_green;
                },
                'refreshData': this._refreshTask,
                'gerReward': function (taskid) {
                    this.dailyTaskService.getReward(taskid, player.id, function (result, data) {
                        if (result) {
                            this.__processReward(data, 'everyDay_tab');
                        } else {
                            tip.toggle(data);
                        }
                    });
                }.bind(this)
            },
            'achievement_tab': {
                'box': this.achevementBox,
                'loadingBar': this._refreshAchevementLiveness,
                'itemLoadingBar': function (item) {
                    var bar_purple = item.getChildByName('bar_purple');
                    var bar_green = item.getChildByName('bar_green');
                    bar_purple.setVisible(true);
                    bar_green.setVisible(false);
                    return bar_purple;
                },
                'refreshData': this._refreshAchievement,
                'gerReward': function (achievementId) {
                    this.achievementService.complete(player.id, achievementId, function (result, data) {
                        if (result) {
                            this.__processReward(d, 'achievement_tab');
                        } else {
                            tip.toggle(data);
                        }
                    });
                }.bind(this)
            }
        };
        this.LIVENESS_UNIT = 'liveness';
        customEventHelper.bindListener(EVENT.UPDATE_STATISTICS, function (e) {
            var data = e.getUserData();
            if (achievementTyps.indexOf(data['type']) > -1) {
                this.achievementService.customAchievementsByType(data['type'], player.id, data['value'] || 1, function (result, d) {
                    if (result) {
                        //this.__processReward(d, 'achievement_tab');
                    }
                }.bind(this));
            }
            if (taskTyps.indexOf(data['type']) > -1) {
                this.dailyTaskService.addExecuteTasksByType(data['type'], player.id, data['value'] || 1, function (result, d) {
                    if (result) {
                        //this.__processReward(d, 'everyDay_tab');
                    }
                });
            }
        }.bind(this));
        this.TYPE_OF_TASK = {"TYPES": taskTyps, "LIVENESS": "daily_leveness"};
        this.TYPE_OF_ACHIEVEMENT = {"TYPES": achievementTyps, "LIVENESS": "achievement_leveness"};
        this.loadingBar = bar.getChildByName('bar_yellow');
        this.loadingNum = bar.getChildByName('num');
        this.loadingNum.setString(0);
        this.loadingBar.setPercent(0);
        this.list = root.getChildByName('list');
        //this.list.pushBackCustomItem(this.taskview.clone());
        this.list.setClippingEnabled(true);
        this.buttons = {};
        this.dailyTaskService = sgt.DailyTaskService;
        this.achievementService = sgt.AchievementService;
        this.taskServiceExt = Network.taskServiceExt;
        for (var i in tabParams) {
            var param = tabParams[i];
            var name = param.name;
            this.buttons[name] = tab.getChildByName(name);
            if (i == 0)
                this.buttons[name].setSelected(true);
            else
                this.buttons[name].setSelected(false);
            this.buttons[name].addEventListener(function (sender, type) {
                if (type === ccui.CheckBox.EVENT_SELECTED) {
                    this.showMenuLayer(sender.name);
                }
                else if (type === ccui.CheckBox.EVENT_UNSELECTED) {
                    sender.setSelected(true);
                }
            }.bind(this), this);
        }
    },
    showMenuLayer: function (name) {
        for (var i in this.buttons) {
            this.buttons[i].setSelected(false);
        }
        this._showTab(name);
        this.buttons[name].setSelected(true);
    }, _convertReards: function (data, split) {
        if (typeof  split === 'undefined') split = true;
        var rewards;
        if (typeof data === 'string') {
            rewards = eval('(' + data + ')');
        } else
            rewards = data;
        var resources = [];
        var livenesscount = 0;
        if (rewards instanceof Array) {
            for (var i in rewards) {
                var unit = rewards[i]['unit'];
                var value = rewards[i]['value'];
                if (split && unit === this.LIVENESS_UNIT) {
                    livenesscount += parseInt(value);
                    continue;
                }
                resources.push(rewards[i]);
            }
        } else {
            for (var k in rewards) {
                var value = rewards[k];
                if (split && k === this.LIVENESS_UNIT) {
                    livenesscount += parseInt(value);
                    continue;
                }
                var obj = {};
                obj['unit'] = k;
                obj['value'] = value;
                resources.push(obj);
            }
        }
        return {resources: resources, livenewss: livenesscount};
    }, __processReward: function (d, tab) {
        var resources = this._convertReards(d);
        PlayerData.updateResource(resources.resources);
        this._submitLivenewss(tab, resources.livenewss);
    },
    _showTab: function (name) {
        for (var k in this._tabObj) {
            this._tabObj[k]['box'].setVisible(false);
        }
        this._tabObj[name]['box'].setVisible(true);
        this._tabObj[name]['loadingBar'].call(this);
        this.refreshItems(name);
    }, openPopup: function () {
        this.showMenuLayer('everyDay_tab');
        GamePopup.openPopup(this.layer, null, false);
    }, _submitLivenewss: function (tab, value) {
        if (tab === 'everyDay_tab' && value) {
            this.dailyTaskService.addExecuteTasksByType(this.TYPE_OF_TASK.LIVENESS, player.id, value, function (result, data) {
                if (result && data && data.length > 0) {
                    var task = data[0];
                    this.loadingNum.setString(task.currentProgress);
                    this.loadingBar.setPercent(Math.floor(task.currentProgress / task.goal * 100));
                }
            }.bind(this));
        }
        if (tab === 'achievement_tab' && value) {
            this.achievementService.customAchievementsByType(this.TYPE_OF_ACHIEVEMENT.LIVENESS, player.id, value, function (result, data) {
                if (result && data && data.length > 0) {
                    var task = data[0];
                    this.loadingNum.setString(task.currentProgress);
                    this.loadingBar.setPercent(Math.floor(task.currentProgress / task.goal * 100));
                }
            }.bind(this));
        }
    }, _refreshDailyTaskLiveness: function () {
        this.dailyTaskService.getDailyTasksByType(player.id, this.TYPE_OF_TASK.LIVENESS, function (result, data) {
            if (result && data && data.length > 0) {
                var task = data[0];
                this.loadingNum.setString(task.currentProgress);
                this.loadingBar.setPercent(Math.floor(task.currentProgress / task.goal * 100));
            } else {

            }
        }.bind(this));
    }, _refreshAchevementLiveness: function () {
        this.achievementService.getAchievementsByType(player.id, this.TYPE_OF_ACHIEVEMENT.LIVENESS, function (result, data) {
            if (result && data && data.length > 0) {
                var task = data[0];
                this.loadingNum.setString(task.currentProgress);
                this.loadingBar.setPercent(Math.floor(task.currentProgress / task.goal * 100));
            }
        }.bind(this));
    }, refreshItems: function (tab) {
        this.list.removeAllChildren(true);
        this._tabObj[tab]['refreshData'].call(this);
    }, _refreshTask: function () {
        var func = this.dailyTaskService.getDailyTasksByType;
        if (this.TYPE_OF_ACHIEVEMENT.TYPES instanceof Array) {
            func = this.taskServiceExt.getDailyTaskByTypes;
        }
        func.call(this, player.id, this.TYPE_OF_TASK.TYPES, function (result, data) {
            if (result && data) {
                data.sort(function (a, b) {
                    if (a.status === sgt.Achievement.PROGRESS_GOT_REWARD)
                        return 1;
                    if (b.status === sgt.Achievement.PROGRESS_GOT_REWARD)
                        return -1;
                    return Math.round(b.currentProgress / b.goal * 100) - Math.round(a.currentProgress / a.goal * 100);
                });
                for (var i = 0, j = data.length; i < j; i++) {
                    this.pushTaskItem(data[i], 'everyDay_tab');
                }
            }
        }.bind(this));
    }, _refreshAchievement: function () {
        var func = this.achievementService.getAchievementsByType;
        if (this.TYPE_OF_ACHIEVEMENT.TYPES instanceof Array) {
            func = this.taskServiceExt.getAchievementTaskByTypes;
        }
        func.call(this, player.id, this.TYPE_OF_ACHIEVEMENT.TYPES, function (result, data) {
            if (result && data) {
                data.sort(function (a, b) {
                    if (a.status === sgt.Achievement.PROGRESS_GOT_REWARD)
                        return 1;
                    if (b.status === sgt.Achievement.PROGRESS_GOT_REWARD)
                        return -1;
                    return Math.round(b.currentProgress / b.goal * 100) - Math.round(a.currentProgress / a.goal * 100);
                });
                for (var i = 0, j = data.length; i < j; i++) {
                    this.pushTaskItem(data[i], 'achievement_tab');
                }
            }
        }.bind(this));
    }, pushTaskItem: function (task, tab) {
        var taskItem = this.taskview.clone();
        var desc = taskItem.getChildByName('text');
        var reward_box = taskItem.getChildByName('reward_box');
        var resources = this._convertReards(task.reward, false);
        var rewards = resources.resources;
        for (var k in rewards) {
            var children = reward_box.getChildren();
            var rewardTip = this.rewardTip.clone();
            var icon = rewardTip.getChildByName('icon');
            icon.loadTexture('res/icon/resources_small/' + rewards[k]['unit'] + '.png');
            var rnum = rewardTip.getChildByName('num');
            rnum.setString(rewards[k]['value']);
            var x = 0;
            children.forEach(function (a, b, c) {
                x += a.getChildByName('icon').width + a.getChildByName('num').width;
            });
            rewardTip.setPositionX(x);
            reward_box.addChild(rewardTip);
        }
        desc.setString(task.description);
        setFont(desc);
        var bar = taskItem.getChildByName('bar');
        var num = bar.getChildByName('num');
        num.setString(task.currentProgress);
        var loading = this._tabObj[tab]['itemLoadingBar'].call(this, bar);
        //var bar_green = bar.getChildByName('bar_green');
        //bar_green.setVisible(false);
        var btn = taskItem.getChildByName('btn');
        var rewardBtn = btn.getChildByName('buy_btn');
        var get = taskItem.getChildByName('get');
        if (task.status === sgt.DailyTask.STATUS_PROGRESS_GOT_REWARD) {
            get.setVisible(true);
            btn.setVisible(false);
        } else /*if (task.status === sgt.DailyTask.STATUS_PROGRESS_UNFINISHED)*/{
            get.setVisible(false);
            btn.setVisible(true);
            rewardBtn.setTag(task.id);
            rewardBtn.setEnabled(true);
            rewardBtn.setBright(true);
            rewardBtn.addClickEventListener(function () {
                var id = rewardBtn.getTag();
                this._tabObj[tab]['gerReward'].call(this, id);
            }.bind(this));
        }
        loading.setPercent(Math.floor(task.currentProgress / task.goal * 100));
        this.list.pushBackCustomItem(taskItem);
    }
});
TaskPanel.open = function () {
    taskPanel.openPopup();
};
