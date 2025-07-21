const cron = require("node-cron")
const smsController = require("../controllers/smsController")
const AutoSmsSettings = require("../models/AutoSmsSettings")

// Run every hour at minute 0
cron.schedule("0 * * * *", async () => {
  try {
    const settings = await AutoSmsSettings.getSettings()
    if (!settings.enabled) {
      return
    }

    const results = await smsController.sendAutoSms()
  } catch (error) {
    console.error("Error in scheduled auto SMS:", error)
  }
})

// Also run on server start to check if any messages need to be sent
const runInitialCheck = async () => {
  try {
    const settings = await AutoSmsSettings.getSettings()
    if (!settings.enabled) {
      return
    }

    const results = await smsController.sendAutoSms()
  } catch (error) {
    console.error("Error in initial auto SMS check:", error)
  }
}

// Initial check disabled - only runs when manually triggered
// runInitialCheck()

module.exports = {
  runInitialCheck
} 