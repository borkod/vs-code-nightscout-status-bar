# Nightscout Extension for Visual Studio Code

[Nightscout](https://nightscout.github.io/) is an open-source application that helps people with diabetes and their families visualize and share real-time data from Continuous Glucose Monitoring sensors. It serves as a centralized platform for tracking blood glucose levels, accessible via any internet-connected web browser.

This Visual Studio Code extension retrieves the most recent blood glucose reading from your Nightscout instance and displays it in your Visual Studio Code status bar.

![Nightscout Extension for Visual Studio Code](https://raw.githubusercontent.com/borkod/vs-code-nightscout-status-bar/main/images/nightscout-vs-code.gif)

## Features

- Periodically retrieves the most recent blood glucose reading from your Nightscout instance and displays it in your Visual Studio Code Status bar
- Provides visual indicator of your blood glucose levels trend
- Provides `Nightscout: Update and Show Last Entry Date` command to manually trigger an update and display the date and time of the latest reading in your Nightscout instance
  - Command can be triggered by clicking on your blood glucose reading in the status bar or via VS Code Command Palette
- Low and High blood glucose level warnings

![Nightscout Extension Warning](https://raw.githubusercontent.com/borkod/vs-code-nightscout-status-bar/main/images/nightscout-warning.gif)

- Fully configurable settings

## Requirements

- You need a running Nightscout instance. There are [Do-It-Yourself (DIY)](https://nightscout.github.io/nightscout/new_user/) and [Nightscout as a Service](https://nightscout.github.io/#nightscout-as-a-service) hosting options available.
- You will need to [create a token](https://nightscout.github.io/nightscout/security/#create-authentication-tokens-for-users) for configuring extension authentication to your Nightscout instance. The token should have `readable` role.

## Extension Settings

![Nightscout Extension Settings](https://raw.githubusercontent.com/borkod/vs-code-nightscout-status-bar/main/images/nightscout-settings.png)

This extension contributes the following settings:

- `nightscout-status-bar.nightscoutHost`: Hostname of your Nightscout instance (e.g. `myinstance.mooo.com`).
- `nightscout-status-bar.token`: Your Nightscout API token. See [Create Authentication Tokens for Users](https://nightscout.github.io/nightscout/security/#create-authentication-tokens-for-users).
- `nightscout-status-bar.glucoseUnits`: Blood glucose units. Supported units are mmol/L (Millimoles Per Litre) and mg/dL (Milligrams per 100 millilitres).
- `nightscout-status-bar.high-glucose-warning.enabled`: Enables high glucose warning.
- `nightscout-status-bar.high-glucose-warning.value`: High glucose warning threshold value (in mg/dL).
- `nightscout-status-bar.low-glucose-warning.enabled`: Enables low glucose warning.
- `nightscout-status-bar.low-glucose-warning.value`: Low glucose warning threshold value (in mg/dL).
- `nightscout-status-bar.updateInterval`: Time interval (in minutes) between queries for updated data.

## Debugging

This extension creates `Nightscout CGM Output` output channel. Several info, warning, and error log messages are written to this channel. You can view this channel to inspect actions the extension is performing.

If you encounter any problems, open a GitHub [issue](https://github.com/borkod/vs-code-nightscout-status-bar/issues).

## About

This extension was inspired by Scott Hanselman's [blog post](https://www.hanselman.com/blog/a-nightscout-segment-for-ohmyposh-shows-my-realtime-blood-sugar-readings-in-my-git-prompt) and the [Nightscout segment](https://ohmyposh.dev/docs/segments/health/nightscout) for [Oh My Posh](https://ohmyposh.dev/) shell prompt engine.

I was looking for a tool that would allow me to monitor my blood glucose levels without distractions. As a Visual Studio Code user, I believed that displaying the readings in the status bar would seamlessly integrate with my development environment.

I hope others find this tool helpful too!