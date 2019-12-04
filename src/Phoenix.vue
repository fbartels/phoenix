<template>
  <div>
    <skip-to target="main">Skip to main</skip-to>
    <div id="Phoenix" class="uk-height-1-1">
      <template v-if="!showHeader">
        <router-view name="fullscreen"></router-view>
      </template>
      <template v-else>
        <message-bar />
        <top-bar :applicationsList="$_applicationsList" :showNotifications="$_notificationsSupported" :userId="user.id" :userDisplayName="user.displayname" :hasAppNavigation="!!appNavigationEntries.length" @toggleAppNavigation="$_toggleAppNavigation(!appNavigationVisible)"></top-bar>
        <side-menu :visible="appNavigationVisible" :entries="appNavigationEntries" @closed="$_toggleAppNavigation(false)"></side-menu>
        <main id="main">
          <router-view id="oc-app-container" name="app" class="uk-height-1-1"></router-view>
        </main>
      </template>
    </div>
  </div>
</template>
<script>
import 'inert-polyfill'
import { mapGetters, mapState, mapActions } from 'vuex'
import TopBar from './components/Top-Bar.vue'
import Menu from './components/Menu.vue'
import MessageBar from './components/MessageBar.vue'
import SkipTo from './components/SkipTo.vue'

export default {
  components: {
    MessageBar,
    'side-menu': Menu,
    TopBar,
    SkipTo
  },
  data () {
    return {
      appNavigationVisible: false
    }
  },
  metaInfo () {
    const metaInfo = {
      title: this.configuration.theme.general.name
    }
    if (this.favicon) {
      metaInfo.link = [
        { rel: 'icon', href: this.favicon }
      ]
    }
    return metaInfo
  },
  beforeMount () {
    this.initAuth()
  },
  computed: {
    ...mapState(['route', 'user']),
    ...mapGetters(['configuration']),
    $_applicationsList () {
      return this.$root.appSwitcherItems
    },

    appNavigationEntries () {
      // FIXME: use store or other ways, not $root
      return this.$root.navItems.filter(item => {
        // FIXME: filter to only show current app
        if (item.enabled === undefined) {
          return true
        }
        if (this.capabilities === undefined) {
          return false
        }
        return item.enabled(this.capabilities)
      })
    },
    showHeader () {
      return this.$route.meta.hideHeadbar !== true
    },
    favicon () {
      return this.configuration.theme.logo.favicon
    },

    $_notificationsSupported () {
      return !!this.user.capabilities.notifications
    }
  },
  methods: {
    ...mapActions(['initAuth']),
    $_toggleAppNavigation (state) {
      this.appNavigationVisible = state
    }
  }
}
</script>
<style>
  body {
    height: 100vh;
    overflow: hidden;
  }
</style>
