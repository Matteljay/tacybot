<template>
  <div class="d-flex align-center">
    <v-combobox :value="getCurrentPortfolio" @input="setCurrentPortfolioIndex" :items="getPortfolios" />
    <v-menu bottom right>
      <template v-slot:activator="{ on, attrs }">
        <v-btn class="mx-3" icon v-bind="attrs" v-on="on">
          <v-icon>mdi-cog</v-icon>
        </v-btn>
      </template>
      <v-list>
        <v-list-item @click="UIaddList('Add List', 'add')">
          <v-list-item-icon>
            <v-icon>mdi-plus-thick</v-icon>
          </v-list-item-icon>
          <v-list-item-title>Add list</v-list-item-title>
        </v-list-item>
        <v-list-item @click="UIaddList('Clone List', 'clone')">
          <v-list-item-icon>
            <v-icon>mdi-content-copy</v-icon>
          </v-list-item-icon>
          <v-list-item-title>Clone list</v-list-item-title>
        </v-list-item>
        <v-list-item @click="UIaddList('Rename List', 'rename', getCurrentPortfolio)">
          <v-list-item-icon>
            <v-icon>mdi-pencil</v-icon>
          </v-list-item-icon>
          <v-list-item-title>Rename list</v-list-item-title>
        </v-list-item>
        <v-list-item
          v-if="content.portfolios && content.portfolios.length > 1"
          @click="deleteDialogShow = true"
        >
          <v-list-item-icon>
            <v-icon>mdi-delete</v-icon>
          </v-list-item-icon>
          <v-list-item-title>Delete list</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>

    <v-dialog v-model="deleteDialogShow" max-width="290">
      <v-card>
        <v-card-title>Delete List '{{ getCurrentPortfolio }}'?</v-card-title>
        <v-card-actions class='pb-6 pr-6'>
          <v-spacer />
          <v-btn color='primary' @click="deleteAction()">Yes</v-btn>
          <v-btn color='primary' @click='deleteDialogShow = false'>Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="editDialog.show" max-width="290">
      <v-card>
        <v-card-title>{{ editDialog.title }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="editDialog.text"
            @keyup.enter='editDialogAction()'
            clearable autofocus
            placeholder='You new title'
            single-line
          ></v-text-field>
        </v-card-text>
        <v-card-actions class='pb-6 pr-6'>
          <v-spacer />
          <v-btn color='primary' @click='editDialogAction()' :disabled="!editDialogValid">OK</v-btn>
          <v-btn color='primary' @click='editDialog.show = false'>Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
export default {
  data: () => ({
    editDialog: { show: false, title: '', OKaction: '', text: '' },
    deleteDialogShow: false,
  }),
  computed: {
    content() { return this.$store.getters.getListContent },
    getCurrentPortfolio() {
      if(!this.content.portfolios?.length) return ''
      return this.content.portfolios[this.content.currentPortfolioIndex].name
    },
    getPortfolios() {
      if(!this.content.portfolios?.length) return []
      return this.content.portfolios.map((o, i) => ({ text: o.name, value: i }))
    },
    editDialogValid() { return (this.editDialog.text.trim() && !this.checkForDuplicate()) },
  },
  methods: {
    setCurrentPortfolioIndex(event) {
      if(this.content.currentPortfolioIndex !== event.value) {
        this.$store.commit('setPortfolioIndex', event.value)
        this.$emit('changedPortfolio')
        this.$store.dispatch('remoteStoragePush', this.content)
      }
    },
    UIaddList(title, OKaction, text='') {
      this.editDialog.show = true
      this.editDialog.title = title
      this.editDialog.OKaction = OKaction
      this.editDialog.text = text
    },
    checkForDuplicate() { return this.content.portfolios.map(o => o.name).includes(this.editDialog.text.trim()) },
    deleteAction() {
      this.deleteDialogShow = false
      this.$store.commit('deletePortfolio')
      this.$store.dispatch('remoteStoragePush', this.content)
      this.$emit('changedPortfolio')
    },
    editDialogAction() {
      const name = this.editDialog.text.trim()
      let clonedPairs
      switch(this.editDialog.OKaction) {
        case 'add':
          this.$store.commit('addPortfolio', { name, pairs: [] })
          this.$emit('changedPortfolio')
          break
        case 'clone':
          clonedPairs = JSON.parse(JSON.stringify( // deep clone
            this.content.portfolios[this.content.currentPortfolioIndex].pairs
          ));
          this.$store.commit('addPortfolio', { name, pairs: clonedPairs })
          this.$emit('changedPortfolio')
          break
        case 'rename':
          this.$store.commit('renamePortfolio', name)
          break
      }
      this.$store.dispatch('remoteStoragePush', this.content)
      this.editDialog.show = false
    },
  },
}
</script>

<style scoped>

</style>
