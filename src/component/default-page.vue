<style lang="stylus" scoped>

</style>

<template>
    <div>
        <!--页面内容-->
        <slot></slot>
    </div>
</template>

<script>
import ajax from '../lib/xhr';
import qs from '../lib/querystring.js';
import { sub, query, queryAll, css } from '../lib/util';
import { showPage } from '../lib/comm';

//
export default {
    data: function(){
        return {
        };
    },
    ready: function(){
        showPage();
    },
    components: {
        
    }
}    
</script>