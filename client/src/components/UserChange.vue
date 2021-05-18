<template>
  <div>
    <v-form ref="form" v-model="validForm" @submit.prevent="submitForm" :disabled="disabled">
      <v-card class="my-4" flat>
        <h1>Change account details</h1>
        <v-card flat class="pa-2" color="amber lighten-3">
          Your account ID: {{ userinfo._id }}<br />
          Time created: {{ getISOtime(userinfo.created) }}
        </v-card>
      </v-card>
      <v-expand-transition>
      <div v-show="showCredentials">
      <v-text-field
        ref="newEmail"
        filled class="mx-2" label="E-mail" v-model="email"
        :rules="showCred(fieldRules.required, fieldRules.email, fieldRules.matchEmails)"
      />
      <v-text-field
        ref="repeatEmail"
        filled class="mx-2" label="Repeat e-mail" v-model="repeatEmail"
        :rules="showCred(fieldRules.required, fieldRules.email, fieldRules.matchEmails)"
      />
      <v-text-field
        ref="newpw"
        filled class="mx-2" background-color="blue lighten-5" label="New password" v-model="newpw"
        :rules="showCred(fieldRules.required, fieldRules.counter, fieldRules.matchpw)"
        :append-icon="showEyeNew ? 'mdi-eye' : 'mdi-eye-off'"
        @click:append="showEyeNew = !showEyeNew"
        :type="showEyeNew ? 'password' : 'text'"
      />
      <v-text-field
        ref="repeatpw"
        filled class="mx-2" background-color="blue lighten-5" label="Repeat new password" v-model="repeatpw"
        :rules="showCred(fieldRules.required, fieldRules.counter, fieldRules.matchpw)"
        :append-icon="showEyeNew ? 'mdi-eye' : 'mdi-eye-off'"
        @click:append="showEyeNew = !showEyeNew"
        :type="showEyeNew ? 'password' : 'text'"
      />
      </div>
      </v-expand-transition>
      <div class="d-flex flex-row mb-1">
        <v-btn color="orange lighten-2" text @click="showCredentials = !showCredentials">
          Change login credentials
        </v-btn>
        <v-spacer />
        <v-btn icon @click="showCredentials = !showCredentials">
          <v-icon>{{ showCredentials ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
        </v-btn>
      </div>
      <v-divider class="mb-6" />
      <v-text-field
        filled class="mx-2" background-color="yellow lighten-4" label="Display name (optional)" v-model="name"
      />
      <v-divider class="mb-6" />
      <v-text-field
        filled class="mx-2" label="Password" v-model="oldpw"
        :rules="[fieldRules.required, fieldRules.counter]"
        :append-icon="showEyeOld ? 'mdi-eye' : 'mdi-eye-off'"
        @click:append="showEyeOld = !showEyeOld"
        :type="showEyeOld ? 'password' : 'text'"
      />
      <v-btn class="primary mt-2" type="submit" :disabled="!validForm || disabled">Send</v-btn>
    </v-form>
  </div>
</template>

<script>
import sha256 from 'tiny-hashes/sha256'
const salt = 'ignore outrank skirmish ethically'
const hash = (pass) => sha256(salt + pass.toString())
export default {
  data() {
    return {
      disabled: false,
      validForm: false,
      showCredentials: false,
      showEyeOld: true,
      showEyeNew: true,
      email: '',
      repeatEmail: '',
      name: '',
      newpw: '',
      repeatpw: '',
      oldpw: '',
      fieldRules: {
        required: value => !!value || 'Required',
        counter: value => !value || (value.trim().length >= 6 || '6 characters minimum'),
        matchpw: () => this.newpw === this.repeatpw || 'Fields must match',
        matchEmails: () => this.email === this.repeatEmail || 'Fields must match',
        email: value => {
          if (!value) return true
          const pattern = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
          return pattern.test(value) || 'Invalid e-mail'
        },
      },
    }
  },
  computed: {
    userinfo() { return this.$store.getters.getUserinfo },
  },
  methods: {
    showCred(...args) {
      if(this.showCredentials) {
        return [ ...args ]
      } else {
        return [ true ]
      }
    },
    preFillFields() {
      const info = this.$store.getters.getUserinfo // read only!
      this.email = this.repeatEmail = info.email
      this.name = info.name
    },
    getISOtime(epoch) {
      try {
        return new Date(epoch).toISOString()
      } catch(_) {
        return 'n/a'
      }
    },
    async submitForm() {
      this.disabled = true
      const info = this.$store.getters.getUserinfo // read only!
      const payload = { url: 'changeUserinfo', password: hash(this.oldpw) }
      const email = this.email.trim().toLowerCase()
      if(this.showCredentials && this.email && email !== info.email) {
        payload.email = email
      }
      if(this.showCredentials && this.newpw) {
        payload.newPassword = hash(this.newpw)
      }
      const name = this.name.trim()
      if(name !== info.name) {
        payload.name = name
      }
      const data = await this.$store.dispatch('upPayloadAction', payload)
      if(data) {
        // clone object (shallow)
        const newInfo = { ...info }
        // update it
        if('email' in payload) newInfo.email = payload.email
        if('name' in payload) newInfo.name = payload.name
        this.$store.commit('setUserinfo', newInfo)
        this.$store.dispatch('popup', { msg: 'User information updated' })
      }
      setTimeout(() => {
        this.disabled = false
        this.newpw = this.repeatpw = this.oldpw = ''
        this.$refs.form && this.$refs.form.resetValidation()
      }, 2000)
    },
  },
  watch: {
    newpw() { !this.$refs.repeatpw.valid && this.$refs.repeatpw.validate() },
    repeatpw() { !this.$refs.newpw.valid && this.$refs.newpw.validate() },
    email() { !this.$refs.repeatEmail.valid && this.$refs.repeatEmail.validate() },
    repeatEmail() { !this.$refs.newEmail.valid && this.$refs.newEmail.validate() },
  },
  mounted() {
    this.preFillFields()
  },
}
</script>

<style scoped>

</style>
