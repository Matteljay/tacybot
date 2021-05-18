<template>
  <div>
    <v-form v-model="validForm" @submit.prevent="submitForm" :disabled="disabled">
      <v-card class="my-4" flat>
        <h1>Create new account</h1>
      </v-card>
      <v-text-field
        ref="newEmail"
        filled class="mx-2" label="E-mail" v-model="email"
        :rules="[fieldRules.required, fieldRules.email, fieldRules.matchEmails]"
      />
      <v-text-field
        ref="repeatEmail"
        filled class="mx-2" label="Repeat e-mail" v-model="repeatEmail"
        :rules="[fieldRules.required, fieldRules.email, fieldRules.matchEmails]"
      />
      <v-text-field
        ref="newpw"
        filled class="mx-2" background-color="blue lighten-5" label="New password" v-model="newpw"
        :rules="[fieldRules.required, fieldRules.counter, fieldRules.matchpw]"
        :append-icon="showEyeNew ? 'mdi-eye' : 'mdi-eye-off'"
        @click:append="showEyeNew = !showEyeNew"
        :type="showEyeNew ? 'password' : 'text'"
      />
      <v-text-field
        ref="repeatpw"
        filled class="mx-2" background-color="blue lighten-5" label="Repeat new password" v-model="repeatpw"
        :rules="[fieldRules.required, fieldRules.counter, fieldRules.matchpw]"
        :append-icon="showEyeNew ? 'mdi-eye' : 'mdi-eye-off'"
        @click:append="showEyeNew = !showEyeNew"
        :type="showEyeNew ? 'password' : 'text'"
      />
      <v-divider class="mb-6" />
      <v-text-field
        v-model="name"
        filled class="mx-2" background-color="yellow lighten-4"
        label="Display name (optional)"
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
      email: '',
      repeatEmail: '',
      newpw: '',
      repeatpw: '',
      showEyeOld: true,
      showEyeNew: true,
      name: '',
      fieldRules: {
        required: value => !!value || 'Required',
        counter: value => value.trim().length >= 6 || '6 characters minimum',
        matchpw: () => this.newpw === this.repeatpw || 'Fields must match',
        matchEmails: () => this.email === this.repeatEmail || 'Fields must match',
        email: value => {
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
    async submitForm() {
      this.disabled = true
      const payload = { url: 'createUser', email: this.email, password: hash(this.newpw) }
      if(this.name) payload.name = this.name
      const data = await this.$store.dispatch('upPayloadAction', payload)
      if(data) this.$store.dispatch('popup', { msg: data })
      setTimeout(() => {
        if(data) {
          this.$store.commit('setCurrentView', 'HomePage')
        } else {
          this.disabled = false
        }
      }, 2000)
    },
  },
  watch: {
    email() { !this.$refs.repeatEmail.valid && this.$refs.repeatEmail.validate() },
    repeatEmail() { !this.$refs.newEmail.valid && this.$refs.newEmail.validate() },
    newpw() { !this.$refs.repeatpw.valid && this.$refs.repeatpw.validate() },
    repeatpw() { !this.$refs.newpw.valid && this.$refs.newpw.validate() },
  },
}
</script>

<style scoped>

</style>
