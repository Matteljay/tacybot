<template>
  <div>
    <v-card class="my-4" flat>
      <h1>Administration</h1>
    </v-card>
    <v-btn class="mt-2 mb-4" color="primary" @click="dumpDB">Dump DB to console</v-btn>
    <v-data-table
      :headers="headers"
      :items="users"
      :items-per-page="-1"
      :sort-by.sync="columnSortBy"
      :sort-desc.sync="columnSortDesc"
      :must-sort='true'
      mobile-breakpoint=720
      hide-default-footer
      class="elevation-1"
    >
      <template v-slot:[`item.created`]="{ item }">
        {{ getISOtime(item.created) }}
      </template>
      <template v-slot:[`item.approved`]="{ item }">
        <v-card
          :disabled="roleEqualHigher(item, userinfo.role)"
          class="pa-1 text-center" width="80px" color="grey lighten-4" flat
          @click.stop="toggleVerify($event, item)"
        >
          <span :style="getApprovedColor(item.approved)">
            {{ item.approved ? 'yes' : 'no' }}
          </span>
        </v-card>
      </template>
      <template v-slot:[`item.actions`]="{ item }">
        <div style="white-space:nowrap;">
          <v-icon class="mr-2"
            :disabled="roleEqualHigher(item, userinfo.role)"
            @click.stop="toggleVerify($event, item)"
          >
            mdi-check-bold
          </v-icon>
          <v-divider class="mr-2 py-2" vertical />
          <v-icon class="mr-2"
            :disabled="roleEqualHigher(item, userinfo.role)"
            @click.stop="openResetPassDialog($event, item)"
          >
            mdi-lock-reset
          </v-icon>
          <v-divider class="mr-2 py-2" vertical />
          <v-icon
            :disabled="roleEqualHigher(item, userinfo.role)"
            @click.stop="openDeleteDialog($event, item)"
          >
            mdi-delete
          </v-icon>
        </div>
      </template>
    </v-data-table>

    <v-dialog v-model="resetPassDialog.show" max-width="290">
      <v-card>
        <v-card-title>Reset password for {{ resetPassDialog.user.email }}?</v-card-title>
        <v-card-text>To new password:<br />{{ resetPassDialog.newPass }}</v-card-text>
        <v-card-actions class='pb-6 pr-6'>
          <v-spacer />
          <v-btn color='primary' @click='resetPass(resetPassDialog.user)'>Yes</v-btn>
          <v-btn color='primary' @click='resetPassDialog.show = false'>Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="deleteDialog.show" max-width="290">
      <v-card>
        <v-card-title>Delete {{ deleteDialog.user.email }}?</v-card-title>
        <v-card-actions class='pb-6 pr-6'>
          <v-spacer />
          <v-btn color='primary' @click='deleteItem(deleteDialog.user)'>Yes</v-btn>
          <v-btn color='primary' @click='deleteDialog.show = false'>Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import sha256 from 'tiny-hashes/sha256'
const salt = 'ignore outrank skirmish ethically'
const hash = (pass) => sha256(salt + pass.toString())
export default {
  data: () => ({
    headers: [
      { align: 'start', text: 'Created', value: 'created' },
      { align: 'start', text: 'ID', value: '_id' },
      { align: 'start', text: 'Role', value: 'role' },
      { align: 'start', text: 'Approved', value: 'approved' },
      { align: 'start', text: 'E-mail', value: 'email' },
      { align: 'start', text: 'Name', value: 'name' },
      { align: 'start', text: 'Actions', value: 'actions', sortable: false }
    ],
    columnSortBy: 'created',
    columnSortDesc: false,
    users: [],
    deleteDialog: { show: false, user: {} },
    resetPassDialog: { show: false, newPass: '', user: {} },
  }),
  computed: {
    userinfo() { return this.$store.getters.getUserinfo },
  },
  methods: {
    async dumpDB() {
      const rawDatabase = await this.$store.dispatch('upGetURL', { url: 'dumpDB' })
      console.log(rawDatabase)
    },
    roleEqualHigher(user, testRole) {
      const roles = [ 'user', '', '', '', 'owner' ]
      return roles.indexOf(user.role) >= roles.indexOf(testRole)
    },
    getApprovedColor(approved) {
      let color = "";
      if(approved) {
        color = "color: green";
      } else {
        color = "color: red";
      }
      return color;
    },
    getISOtime(epoch) {
      try {
        return new Date(epoch).toISOString()
      } catch(_) {
        return 'n/a'
      }
    },
    async toggleVerify(event, user) {
      const success = await this.$store.dispatch('upPayloadAction',
        { url: 'toggleApproved', uid: user._id })
      if(!success) return
      user.approved = !user.approved
      event.target.blur()
    },
    async resetPass(user) {
      const success = await this.$store.dispatch('upPayloadAction',
        { url: 'resetPass', uid: user._id, password: hash(this.resetPassDialog.newPass) })
      this.resetPassDialog.show = false
      if(!success) return
      this.$store.dispatch('popup', { msg: success + ' (see console)' })
      console.log(success)
    },
    async deleteItem(user) {
      const success = await this.$store.dispatch('upPayloadAction',
        { url: 'deleteUser', uid: user._id })
      this.deleteDialog.show = false
      if(!success) return
      this.users = this.users.filter(el => el.email !== user.email)
    },
    openResetPassDialog(event, user) {
      const newPass = 'Reset' + (new Date).toISOString().substring(0, 10)
      this.resetPassDialog = { show: true, newPass, user }
      event.target.blur()
    },
    openDeleteDialog(event, user) {
      this.deleteDialog = { show: true, user }
      event.target.blur()
    },
  },
  async mounted() {
    //console.log(JSON.stringify()) //DEBUG
    this.users = await this.$store.dispatch('upGetURL', { url: 'listUsers' })
  },
}
</script>

<style scoped>

</style>
