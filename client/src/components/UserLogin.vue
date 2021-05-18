<template>
  <div>
    <div v-if="userinfo.email && !disabled">
      <p class="mt-6">
        You're already logged in as: {{ userinfo.name || userinfo.email }}
      </p>
      <v-btn class="px-2 py-0 ma-0"
        color="indigo darken-1"
        plain outlined
        @click.stop="logout()"
      >
        Log out
      </v-btn>
    </div>
    <v-form v-else ref="form" v-model="validForm" @submit.prevent="submitForm" :disabled="disabled">
      <v-card class="my-4" flat>
        <h1>Log in</h1>
      </v-card>
      <v-text-field
        ref="newEmail"
        filled class="mx-2" label="E-mail" v-model="email"
        :rules="[fieldRules.required, fieldRules.email]"
      />
      <v-text-field
        filled class="mx-2" label="Password" v-model="password"
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
      email: '',
      password: '',
      showEyeOld: true,
      fieldRules: {
        required: value => !!value || 'Required',
        counter: value => value.trim().length >= 6 || '6 characters minimum',
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
    logout() {
      localStorage.removeItem('token')
      window.location.reload()
    },
    async submitForm() {
      this.disabled = true
      const payload = { url: 'login', email: this.email, password: hash(this.password) }
      const data = await this.$store.dispatch('upPayloadAction', payload)
      delete payload.password
      if(data) {
        localStorage.setItem('token', data.token)
        this.$store.commit('setAuthHeader', data.token)
        delete data.token
        this.$store.commit('extractListContent', data)
        this.$store.commit('setUserinfo', data)
        this.$store.dispatch('popup', { msg: data.name ? 'Welcome ' + data.name : 'Welcome!' })
      }
      setTimeout(() => {
        if(data) {
          this.$store.commit('setCurrentView', 'CryTable')
        } else {
          this.disabled = false
          this.password = ''
          this.$refs.form && this.$refs.form.resetValidation()
        }
      }, 2000)
    },
  },
}
</script>

<style scoped>

</style>
