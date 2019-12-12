<template>
  <div>
    <oc-button id="_userMenuButton" class="oc-topbar-personal uk-height-1-1" variation="primary" aria-label="$gettext('User Menu')" ref="menuButton">
      <avatar class="oc-topbar-personal-avatar" :userid="userId" />
      <span class="oc-topbar-personal-label">{{ userDisplayName }}</span>
    </oc-button>
    <oc-drop toggle="#_userMenuButton" mode="click" :options="{pos:'bottom-right'}" class="uk-width-large" ref="menu">
      <div class="uk-card-body uk-flex uk-flex-middle uk-flex-column">
        <avatar
          :userid="userId"
          :width="128"
        />
        <h3 class="uk-card-title">{{ userDisplayName }}</h3>
        <span v-if="userEmail">{{ userEmail }}</span>
        <oc-button type="a" href="/account">Manage your account</oc-button>
        <br/>
        <oc-button type="a" @click="logout()">Sign out</oc-button>
      </div>
      <div class="uk-card-footer uk-flex uk-flex-middle uk-flex-column">
        <span>Version: {{appVersion.version}}-{{appVersion.hash}} ({{appVersion.buildDate}})</span>
      </div>
    </oc-drop>
  </div>
</template>

<script>
import appVersionJson from '../../build/version.json'
import Avatar from './Avatar.vue'

export default {
  components: {
    Avatar
  },
  props: {
    userId: {
      type: String,
      required: true
    },
    userDisplayName: {
      type: String,
      required: true
    },
    userEmail: {
      type: String,
      required: false,
      default: null
    }
  },
  data () {
    return {
      appVersion: appVersionJson
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
    navigateTo (route) {
      this.$router.push(route)
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
        this.$refs.menuButton.$el.querySelector('a:first-of-type').focus()
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
