<p align="center">
<a href="https://www.uni-due.de/soco/research/projects/openlap.php" target="_blank" rel="noopener noreferrer">
<img style="max-width: 350px; width: 40%;" src="img/openlap-logo.svg" alt="openlap logo">
</a>
</p>

The Open Learning Analytics Platform (OpenLAP) lays the foundation for a Do-it-yourself (DIY) learning analytics ecosystem. OpenLAP follows a Human-Centered Learning Analytics (HCLA) approach and aims at engaging different stakeholders in co-designing and developing personalized learning analytics indicators. It provides a detailed technical open learning analytics (OLA) architecture with a concrete implementation of all its components, seamlessly integrated into a platform.

## 🚀 Get Started

#### Live instances

- Production: [TBA]() (latest [release (TBA)]())
- Preview: [TBA]() ([branch `main`)](https://github.com/ude-soco/openlap-official/tree/main))

#### Build and run

- TBA

## 🖥️ Application stack

- TBA

## 🔨 Development Setup Guide

#### Step 1: Pre-requisites

Download and install the following software:

- Node.js on [Ubuntu](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-22-04)/[Windows](https://nodejs.org/dist/v20.17.0/)
  - Preferred to install Node Version Manager (NVM) for [Ubuntu](https://tecadmin.net/how-to-install-nvm-on-ubuntu-22-04/)/[Windows](https://github.com/coreybutler/nvm-windows/releases).
  - Open a terminal and then type `nvm install 20.17.0` to install Node.js v20.17.0
  - Then type `nvm use 20.17.0` to use the Node.js v20.17.0 to install node packages
- [Java 11](https://www.oracle.com/java/technologies/javase/jdk11-archive-downloads.html)
- Preferred IDE IntelliJ Ultimate [Ubuntu](https://www.golinuxcloud.com/install-maven-ubuntu/)/[Windows](https://www.jetbrains.com/de-de/idea/download/#section=windows)
- Maven (latest) on [Ubuntu](https://www.golinuxcloud.com/install-maven-ubuntu/)/[Windows](https://phoenixnap.com/kb/install-maven-windows)
- MongoDB Community Server (latest) [Ubuntu](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/#install-mongodb-community-edition)/[Windows](https://www.mongodb.com/try/download/community). Additionally, install MongoDB Compass [Ubuntu](https://www.mongodb.com/try/download/shell)/[Windows](https://www.mongodb.com/try/download/compass)
- Postman on [Ubuntu](https://itslinuxfoss.com/how-to-install-postman-on-ubuntu-22-04/)/[Windows](https://www.postman.com/downloads/)
- Git on [Ubuntu](https://www.digitalocean.com/community/tutorials/how-to-install-git-on-ubuntu-22-04#installing-git-with-default-packages)/ [Windows](https://git-scm.com/downloads)
- Github Desktop on [Ubuntu](https://www.linuxcapable.com/how-to-install-github-desktop-on-ubuntu-linux/)/[Windows](https://desktop.github.com/)

#### Step 2: Installation Guide for Analytics Framework

- Clone the repository using Github Desktop.
- Open the project `openlap-analyticsframework` using IntelliJ.
- Under the `Project` panel, right-click on the `openlap-analyticsframework`, click `Maven` and then `Reload Project`.
- Right click on the `openlap-analyticsframework` again, and click `Open Module Settings`, click on `Project` tab and check whether `coretto-11` is chosen as the SDK for the project.
  - If not, click on SDK dropdown menu, click `Download SDK`, choose version 11, and then click `Download`.
  - After the download is complete, click `Apply`.
- Under `Project Settings` click on `Modules` tab. Find the directory `resources` under `src>main>resources`. Right click on `resources` and mark as `Resources`
- Right-click on the `openlap-analyticsframework` again, and click `Build Module 'OpenLAP-AnalyticsFramework'` to build the project.
- Click the play button in the top right corner to run the `OpenLAPAnalyticsFrameworkApplication` class to start the server.
- Open the Postman software and import the file `ANALYTICS_FRAMEWORK.postman_collection.json` found under `docs` folder

#### Step 3: Installation Guide for OpenLAP Indicator Editor

- Open the project `openlap-indicatoreditor` using IntelliJ.

- Open the terminal and type the following command to install the node packages.

  ```bash
  npm ci
  ```

  - If you get an error, try typing the `npm install` or `npm install --force` command.
- Make a copy of the `.env.example` file, located inside the `openlap-indicatoreditor` folder, and rename it to `.env`.
- Run the following command in the terminal to start the server.

  ```bash
  npm run dev
  ```

- Open the browser and go to [http://localhost:5173/](http://localhost:5173/).
