/* template[default-page] */

import '../../font/iconfont.css'
import '../../css/w3.css'
import '../../css/w3-theme-indigo.css'

import Vue from 'vue'

new Vue({
    el: '#body',
    template: `
        <div>
            <page>
                hello world!
            </page>
        </div>
    `,
    data: {
    },
    components: {
        'page': require('../../component/default-page.vue'),
    },
});