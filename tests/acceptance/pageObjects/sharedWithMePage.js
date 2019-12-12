const navigationHelper = require('../helpers/navigationHelper')
const util = require('util')

module.exports = {
  url: function () {
    return this.api.launchUrl + '/#/files/shared-with-me/'
  },
  commands: {
    /**
     * like build-in navigate() but also waits till for the progressbar to appear and disappear
     * @returns {*}
     */
    navigateAndWaitTillLoaded: function () {
      return navigationHelper.navigateAndWaitTillLoaded(
        this.url(), this.page.FilesPageElement.filesList().elements.filesListProgressBar
      )
    },
    /**
     * Checks if the file-row of the desired file-name with the username is present with the desired status of accepted,
     * declined or pending
     *
     * @param {string} filename
     * @param {string} status - It takes one of the following : declined, pending or '' for accepted
     * @param {string} user
     *
     * @return {Promise<boolean>}
     */
    isDesiredStatusPresent: async function (filename, status, user) {
      let isPresent = false
      let requiredXpath = this.api.page.FilesPageElement.filesList().getFileRowSelectorByFileName(filename) +
                          util.format(this.elements.assertStatusFileRow.selector, status)
      requiredXpath = user === undefined ? requiredXpath : requiredXpath +
                      util.format(this.elements.getSharedFromUserName.selector, user)
      await this
        .waitForElementVisible({
          locateStrategy: this.elements.assertStatusFileRow.locateStrategy,
          selector: requiredXpath,
          abortOnFailure: false // continue if fails too because there couldn't be desired status
        })
        .api.elements(
          this.elements.assertStatusFileRow.locateStrategy,
          requiredXpath,
          (result) => {
            isPresent = result.value.length > 0
          }
        )
      return isPresent
    },
    /**
     * @param {string} filename
     * @param {string} action - It takes one of the following : Decline and Accept
     * @param {string} user
     *Performs required action, such as accept and decline, on the file row element of the desired file name
     *  shared by specific user
     */
    declineAcceptFile: function (action, filename, user) {
      const actionLocatorButton = {
        locateStrategy: this.elements.actionOnFileRow.locateStrategy,
        selector: this.api.page.FilesPageElement.filesList().getFileRowSelectorByFileName(filename) +
                  util.format(this.elements.getSharedFromUserName.selector, user) +
                  util.format(this.elements.actionOnFileRow.selector, action)
      }
      return this
        .initAjaxCounters()
        .waitForElementVisible(actionLocatorButton)
        .click(actionLocatorButton)
        .waitForOutstandingAjaxCalls()
    },
    /**
     * gets the username of user that the element(file/folder/resource) on the shared-with-me page is shared by
     *
     * @param {string} element
     *
     * @return {Promise<string>}
     */
    getSharedByUser: async function (element) {
      let username
      const requiredXpath = this.api.page.FilesPageElement.filesList().getFileRowSelectorByFileName(element) +
          this.elements.sharedFrom.selector
      await this.waitForElementVisible({
        locateStrategy: this.elements.sharedFrom.locateStrategy,
        selector: requiredXpath
      })
        .api.getText(
          this.elements.sharedFrom.locateStrategy,
          requiredXpath,
          (result) => {
            username = result.value
          }
        )
      return username
    },
    isSharePresent: async function (element, sharer) {
      const requiredXpath = this.api.page.FilesPageElement.filesList().getFileRowSelectorByFileName(element) +
                          util.format(this.elements.getSharedFromUserName.selector, sharer)
      let shareFound = false
      await this.api.elements('xpath', requiredXpath, function (result) {
        shareFound = result.value.length > 0
      })
      return shareFound
    }
  },
  elements: {
    assertStatusFileRow: {
      selector: '//span[.="%s"]/../..',
      locateStrategy: 'xpath'
    },
    getSharedFromUserName: {
      selector: '//div[normalize-space(.)="%s"]',
      locateStrategy: 'xpath'
    },
    sharedFrom: {
      selector: "//td[@class='uk-text-meta uk-text-nowrap']/div",
      locateStrategy: 'xpath'
    },
    actionOnFileRow: {
      selector: '/../..//a[.="%s"]',
      locateStrategy: 'xpath'
    }
  }
}
