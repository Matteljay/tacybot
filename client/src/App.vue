<template>
  <v-app>
    <v-card class="overflow-hidden" width="100%" height="100%" flat>
      <v-app-bar
        app
        color="primary"
        dark
      >
        <div class="d-flex align-center"
          @click.stop="$store.commit('setCurrentView', 'HomePage')"
        >
          <v-img
            alt="Tc"
            class="shrink"
            contain
            src='@/assets/logo.svg'
            transition="scale-transition"
            width="60"
          />
          <h3 class="ml-3 font-weight-bold">TacyBot</h3>
        </div>
        <v-spacer />
        <div class="d-flex align-center">
          <v-icon class="mr-2" v-if="!$store.getters.getBackendSynced">
            mdi-sync-alert
          </v-icon>
          <span class="font-weight-black">{{ getShortName }}</span>
        </div>
        <v-app-bar-nav-icon @click.stop="drawerClick" />
      </v-app-bar>
      <NavBar v-model="drawer" />
      <v-main class="appContainer">
        <component class="mx-4"
          :is="$store.getters.getCurrentView"
        />
      </v-main>

      <v-dialog max-width="290"
        :value="!!$store.getters.getInfoDialog"
        @input="$store.commit('infoDialog', '')"
      >
        <v-card>
          <v-card-text class='pt-6 pb-6 pr-6'>
            <p style="white-space:pre-line" v-html="$store.getters.getInfoDialog" />
          </v-card-text>
          <v-card-actions class='mt-0 pt-0 pb-6 pr-6'>
            <v-btn class="my-0 mx-auto text-center" plain color="green"
              @click.stop="$store.commit('infoDialog', '')">Done</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-snackbar
        :value="$store.getters.getPopup.show"
        @input="$store.commit('setPopup', null)"
        timeout=-1
        :color="$store.getters.getPopup.color || 'green'"
      >
        {{ $store.getters.getPopup.msg }}
      </v-snackbar>
    </v-card>
  </v-app>
</template>

<script>
import NavBar from './components/NavBar';
import HomePage from './components/HomePage';
import UserCreate from './components/UserCreate';
import UserLogin from './components/UserLogin';
import UserChange from './components/UserChange';
import AdminPage from './components/AdminPage';
import CryTable from './components/CryTable';
import Trader from './components/Trader';
const MAX_NAME_CHARS = 12;
export default {
  name: 'App',
  components: {
    NavBar,
    HomePage,
    UserCreate,
    UserLogin,
    UserChange,
    AdminPage,
    CryTable,
    Trader,
  },
  data: () => ({
    drawer: false,
  }),
  computed: {
    getShortName() {
      const info = this.$store.getters.getUserinfo // read only!
      let ret = info.name
      if(!ret) ret = info.email
      if(!ret) return ''
      if(ret.length > MAX_NAME_CHARS) {
        return ret.substring(0, MAX_NAME_CHARS - 1) + '…'
      }
      return ret
    },
  },
  methods: {
    drawerClick() {
      window.scrollTo(0, 0)
      this.drawer = !this.drawer
    },
    async setInitialPage() {
      const token = localStorage.getItem('token')
      if(token) {
        this.$store.commit('setAuthHeader', token)
        const userinfo = await this.$store.dispatch('upGetURL', { url: '' })
        if(userinfo) {
          this.$store.commit('extractListContent', userinfo)
          this.$store.commit('setUserinfo', userinfo)
          this.$store.commit('setCurrentView', 'CryTable')
          return
        }
      }
      this.$store.commit('setCurrentView', 'HomePage')
    },
  },
  created() {
    // currentView will remain empty until userinfo is fetched
    this.setInitialPage()
  },
};
</script>

<style>
.appContainer {
  margin-left: auto;
  margin-right: auto;
  padding: 0px 0px 0px 0px;
  /* for edge cases: */
  width: 100%;
  max-width: 100%;
}
@media (min-width: 768px) {
  .appContainer {
    width: 750px;
  }
}
@media (min-width: 992px) {
  .appContainer {
    width: 970px;
  }
}
@media (min-width: 1200px) {
  .appContainer {
    width: 1170px;
  }
}
.v-data-table td {
  padding: 0 8px !important;
}
</style>
