const { client } = require('nightwatch-api')
const { Given, When, Then } = require('cucumber')
const httpHelper = require('../helpers/httpHelper')
const fetch = require('node-fetch')
const assert = require('assert')

When('user {string} is sent a notification', function (user) {
  const body = new URLSearchParams()
  body.append('user', user)

  return fetch(
    client.globals.backend_url + '/ocs/v2.php/apps/testing/api/v1/notifications',
    { method: 'POST', headers: httpHelper.createAuthHeader(user), body: body }
  )
    .then(res => httpHelper.checkStatus(res, 'Could not generate notification.'))
})

When('the user marks the notification as read', function () {
  return client.page.phoenixPage().markNotificationAsRead()
})

When('the user accepts all shares displayed in the notifications on the webUI', function () {
  return client.page.phoenixPage().acceptAllSharesInNotification()
})

When('the user declines all shares displayed in the notifications on the webUI', function () {
  return client.page.phoenixPage().declineAllSharesInNotification()
})

Given('app {string} has been enabled', function (app) {
  const headers = httpHelper.createAuthHeader('admin')
  return fetch(client.globals.backend_url + '/ocs/v2.php/cloud/apps/' + app + '?format=json', {
    headers,
    body: {},
    method: 'POST'
  }).then(res => {
    httpHelper.checkStatus(res, 'Failed while trying to enable the app')
    return res.json()
  })
})

Then('the user should see the notification bell on the webUI', function () {
  return client.page.phoenixPage().waitForElementVisible('@notificationBell')
})

Then('the user should see the notification bell on the webUI after a page reload', function () {
  client.refresh()
  return client.page.phoenixPage().waitForElementVisible('@notificationBell')
})

Then('the notification bell should disappear on the webUI', function () {
  return client.page.phoenixPage().waitForElementNotPresent('@notificationBell')
})

Then('the user should see {int} notifications on the webUI with these details',
  async function (numberOfNotifications, dataTable) {
    const expectedNotifications = dataTable.hashes()
    const notifications = await client.page.phoenixPage().getNotifications()
    assert.strictEqual(
      notifications.length,
      numberOfNotifications,
      'Notification count miss-match!'
    )
    for (const element of expectedNotifications) {
      const userSettings = require('../helpers/userSettings')
      const isPresent = notifications.includes(userSettings.replaceInlineCode(element.title))
      assert.ok(
        isPresent,
        `Expected: '${element.title}' to be present but found: not present in ${notifications}`)
    }
  })

Then('the user should have no notifications', async function () {
  const isAbsent = await client.page.phoenixPage().isNotificationAbsent()
  assert.ok(isAbsent)
})
