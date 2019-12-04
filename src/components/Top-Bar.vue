<template>
  <div>
    <message-bar />
    <oc-navbar id="oc-topbar" tag="header" class="oc-topbar uk-position-relative uk-navbar">
      <oc-navbar-item position="left">
        <oc-button v-if="hasAppNavigation" icon="menu" variation="primary" class="oc-topbar-menu-burger uk-height-1-1" aria-label="Menu" @click="$_onOpenAppNavigation" ref="menubutton">
          <span class="oc-topbar-menu-burger-label" v-translate>Menu</span>
        </oc-button>
      </oc-navbar-item>
      <oc-navbar-item position="center">
        <router-link to="/" class="oc-topbar-icon">ownCloud X</router-link>
      </oc-navbar-item>
      <oc-navbar-item position="right" v-if="!isPublicPage">
        <notifications v-if="activeNotifications.length"></notifications>
        <applications-menu :applicationsList="applicationsList"/>
        <user-menu :userid="userId" :userDisplayName="userDisplayName" />
      </oc-navbar-item>
    </oc-navbar>
  </div>
</template>

<script>
import pluginHelper from '../mixins/pluginHelper.js'
import ApplicationsMenu from './ApplicationsMenu.vue'
import UserMenu from './UserMenu.vue'
import MessageBar from './MessageBar.vue'
import Notifications from './Notifications.vue'

export default {
  mixins: [
    pluginHelper
  ],
  components: {
    Notifications,
    ApplicationsMenu,
    UserMenu,
    MessageBar
  },
  props: {
    showNotifications: {
      type: Boolean,
      required: false,
      default: false
    },

    userId: {
      type: String,
      required: false,
      default: null
    },
    userDisplayName: {
      type: String,
      required: false,
      default: null
    },
    applicationsList: {
      type: Array,
      required: false,
      default: () => null
    },
    hasAppNavigation: {
      type: Boolean,
      required: false,
      default: false
    }
  },
  data () {
    return {
      intervalId: null,
      isApplicationsMenuVisible: false,
      isSideMenuVisible: false,
      activeNotifications: []
    }
  },
  methods: {
    $_onOpenAppNavigation () {
      this.$emit('toggleAppNavigation')
    },
    fetchNotifications () {
      // TODO
    }
  },
  computed: {
    isPublicPage () {
      return !this.userId
    }
  },
  created: function () {
    if (this.isPublicPage) {
      return
    }

    // only fetch notifications if the server supports them
    if (this.showNotifications) {
      this.fetchNotifications(this.$client).then(() => {
        this.intervalId = setInterval(() => {
          this.fetchNotifications(this.$client).catch(() => {
            if (this.intervalId) {
              clearInterval(this.intervalId)
            }
          })
        }, 30000)
      })
    }
  },
  destroyed: function () {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }
}
</script>
