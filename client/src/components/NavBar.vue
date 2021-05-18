<template>
  <v-navigation-drawer
    v-model="drawer"
    class="primary darken-2"
    dark
    absolute
    temporary
    right
  >
    <v-list>
      <v-list-item
        v-if="userinfo.email"
        class="py-2" link
        @click.stop="$store.commit('setCurrentView', 'CryTable'); drawer = false"
      >
        <v-list-item-icon>
          <v-icon>mdi-view-dashboard</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>Dashboard</v-list-item-title>
        </v-list-item-content>
      </v-list-item>

      <v-list-item
        v-if="userinfo.email"
        class="py-2" link
        @click.stop="$store.commit('setCurrentView', 'Trader'); drawer = false"
      >
        <v-list-item-icon>
          <v-icon>mdi-swap-horizontal-bold</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>Trader</v-list-item-title>
        </v-list-item-content>
      </v-list-item>

      <v-list-item
        class="py-2" link
        @click.stop="$store.commit('setCurrentView', 'HomePage'); drawer = false"
      >
        <v-list-item-icon>
          <v-icon>mdi-home</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>Home</v-list-item-title>
        </v-list-item-content>
      </v-list-item>

      <v-list-item
        v-if="!userinfo.email"
        @click.stop="$store.commit('setCurrentView', 'UserLogin'); drawer = false"
        class="py-2" link
      >
        <v-list-item-icon>
          <v-icon>mdi-login</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>Log in</v-list-item-title>
        </v-list-item-content>
      </v-list-item>

      <v-list-item
        v-if="userinfo.email"
        @click.stop="$store.commit('setCurrentView', 'UserChange'); drawer = false"
        class="py-2" link
      >
        <v-list-item-icon>
          <v-icon>mdi-account-edit</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>User Info</v-list-item-title>
        </v-list-item-content>
      </v-list-item>

      <v-list-item
        v-if="userinfo.role === 'owner'"
        class="py-2" link
        @click.stop="$store.commit('setCurrentView', 'AdminPage'); drawer = false"
      >
        <v-list-item-icon>
          <v-icon>mdi-gavel</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>Admin</v-list-item-title>
        </v-list-item-content>
      </v-list-item>

      <v-list-item
        v-if="userinfo.email"
        class="py-2" link
        @click.stop="logout()"
      >
        <v-list-item-icon>
          <v-icon>mdi-logout</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>Log out</v-list-item-title>
        </v-list-item-content>
      </v-list-item>

    </v-list>
  </v-navigation-drawer>
</template>

<script>
export default {
  props: {
    value: Boolean,
  },
  data: () => ({
    //
  }),
  computed: {
    userinfo() { return this.$store.getters.getUserinfo },
    drawer: {
      get() { return this.value },
      set(value) { this.$emit('input', value) },
    },
  },
  methods: {
    logout() {
      localStorage.removeItem('token')
      window.location.reload()
    },
  },
};
</script>

<style scoped>

</style>
