var Vue = require('vue');
Vue.config.debug = true;
Vue.use(require('vue-resource'));

var i18nMixin = require('vue-i18n-mixin');
i18nMixin.methods.t = i18nMixin.methods.translate;

Vue.mixin(i18nMixin);

require('./util');
require('./components/tree');
require('./components/loader');

var messaging;
var config = require('./config');

if (window.parent && window.parent !== window) {
    var Messaging = require('../shared/util/messaging');
    messaging = new Messaging('*', window.parent);
    messaging.call('picker.getConfig').then(function(configOverride) {
        require('extend')(true, config, configOverride);
        create();
    });
} else {
    config.storages = {
        entermediaDB: {
            label: 'EnterMediaDB',
            loginHint: 'Username: admin<br>Password: admin',
            adapter: 'entermediadb',
            url: 'http://em9.entermediadb.org/openinstitute',
            proxy: true
        },
        github: {
            adapter: 'github',
            username: 'netresearch',
            repository: 'assetpicker'
        }
    };
    create();
}

function create() {
    new Vue({
        el: '#app',
        data: function () {
            return {
                locale: (function () {
                    var lang, available = ['en', 'de'];
                    if (config.language === 'auto') {
                        lang = (navigator.language || navigator.userLanguage).replace(/^([a-z][a-z]).+$/, '$1');
                    } else {
                        lang = config.language;
                    }
                    if (available.indexOf(lang) < 0) {
                        lang = available[0];
                        if (config.language !== 'auto') {
                            console.warn('Configured language %s is not available', config.language);
                        }
                    }
                    return lang;
                })(),
                config: config,
                picked: require('./model/pick'),
                selection: require('./model/selection'),
                numStorages: Object.keys(config.storages).length,
                maximized: false
            }
        },
        translations: require('./locales'),
        components: {
            storage: require('./components/storage'),
            'items': require('./components/items'),
            handle: require('./components/handle')
        },
        created: function () {
            if (messaging) {
                messaging.registerServer('app', this);
                messaging.call('picker._trigger', 'ready');
            }
        },
        ready: function () {
            this.$el.className += (this.$el.className ? ' ' : '') + 'loaded';
        },
        events: {
            'finish-pick': function () {
                this.pick();
            }
        },
        watch: {
            maximized: function (maximized) {
                this.callPicker('picker._trigger', 'resize', maximized);
            }
        },
        methods: {
            setPickConfig: function (config) {
                this.config.pick = config;
            },
            callPicker: function(method) {
                if (messaging) {
                    messaging.call.apply(messaging, arguments);
                }
            },
            cancel: function() {
                this.picked.clear();
                this.callPicker('picker.modal.close');
            },
            pick: function() {
                this.callPicker('picker.pick', this.picked.export());
                this.picked.clear();
            }
        }
    });
}
