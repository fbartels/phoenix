<template>
  <div v-if="!!applicationsList.length">
    <oc-button id="_appSwitcherButton" icon="apps" variation="primary" class="oc-topbar-menu-burger uk-height-1-1"  aria-label="$gettext('Application Switcher')" ref="menubutton" />
    <oc-drop toggle="#_appSwitcherButton" mode="click" :options="{pos:'bottom-right'}" class="uk-width-large" ref="menu">
      <div class="uk-grid-small uk-text-center" uk-grid>
        <div class="uk-width-1-3" v-for="(n, nid) in applicationsList" :key="nid">
          <a :href="n.route ? n.route.path : null" @click="openItem(n.url)">
            <oc-icon v-if="n.iconMaterial && !n.iconUrl" :name="n.iconMaterial" size="large" />
            <oc-icon v-if="n.iconUrl" :url="n.iconUrl" :variation="n.iconVariation || system" size="large" />
            <oc-icon v-if="!n.iconMaterial && !n.iconUrl" name="deprecated" size="large" />
            <div>{{ translateMenu(n) }}</div>
          </a>
        </div>
      </div>
    </oc-drop>
  </div>
</template>

<script>
export default {
  props: {
    visible: {
      type: Boolean,
      required: false,
      default: false
    },
    applicationsList: {
      type: Array,
      required: false,
      default: () => null
    }
  },
  watch: {
    visible (val) {
      if (val) {
        this.focusFirstLink()
      } else {
        this.$emit('closed')
      }
    }
  },
  computed: {
    _logoutItemText () {
      // return this.$gettextInterpolate(this.$gettext('Exit %{product}'), { product: this.configuration.theme.general.name })
      return 'Logout' // TODO
    }
  },
  methods: {
    logout () {
      this.visible = false
      this.$store.dispatch('logout')
    },
    translateMenu (navItem) {
      // FIXME need to know the locale
      // return this.$gettext(navItem.name)
      return navItem.name
    },
    openItem (url) {
      if (url) {
        const win = window.open(url, '_blank')
        win.focus()
      }
    },
    focusFirstLink () {
      /*
      * Delay for two reasons:
      * - for screen readers Virtual buffer
      * - to outsmart uikit's focus management
      */
      setTimeout(() => {
        this.$refs.menu.$el.querySelector('a:first-of-type').focus()
      }, 500)
    }
  }
}
</script>
<style scoped>
#nav-dropdown {
    position: fixed;
    top: 15px;
    right: 0;
    padding-left: 32px;
    width: 200px;
    height: 300px;
    z-index: 10000;
    background-color: white;
    border: 1px solid black;
    box-shadow: 10px 1px 10px;
}
</style>
