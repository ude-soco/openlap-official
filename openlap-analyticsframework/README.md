<p align="center">
<a href="https://www.uni-due.de/soco/research/projects/openlap.php" target="_blank" rel="noopener noreferrer">
<img style="max-width: 350px; width: 40%;" src="docs/img/openlap-logo.svg" alt="openlap logo">
</a>
</p>

The Open Learning Analytics Platform (OpenLAP) lays the foundation for a Do-it-yourself (DIY) learning analytics ecosystem. OpenLAP follows a Human-Centered Learning Analytics (HCLA) approach and aims at engaging different stakeholders in co-designing and developing personalized learning analytics indicators. It provides a detailed technical open learning analytics (OLA) architecture with a concrete implementation of all its components, seamlessly integrated into a platform.

## 🚀 Get Started with Analytics Framework

- TODO

## 🔨 Development Setup Guide

Download and install the following software

- Install IntelliJ Ultimate on [Ubuntu](https://theubuntulinux.com/faq/how-to-install-intellij-idea-on-ubuntu-22-04-linux-desktop/#:~:text=Add%20the%20PPA%20repository%20and%20update%20the%20system,type%20the%20intellij%20idea%20community%20edition%20download%20intellij-idea-community) or [Windows](https://www.jetbrains.com/de-de/idea/download/#section=windows). Register a JetBrains account and get free subscription as a student.
- Maven (latest) on [Ubuntu](https://www.golinuxcloud.com/install-maven-ubuntu/) or [Windows](https://phoenixnap.com/kb/install-maven-windows)
- MongoDB Community Server (latest) on [Ubuntu](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/#install-mongodb-community-edition) or [Windows](https://www.mongodb.com/try/download/community). Additionally, install MongoDB Compass on [Ubuntu](https://www.mongodb.com/try/download/shell) or [Windows](https://www.mongodb.com/try/download/compass)
- Postman on [Ubuntu](https://itslinuxfoss.com/how-to-install-postman-on-ubuntu-22-04/) or [Windows](https://www.postman.com/downloads/)
- Git on [Ubuntu](https://www.digitalocean.com/community/tutorials/how-to-install-git-on-ubuntu-22-04#installing-git-with-default-packages) or [Windows](https://git-scm.com/downloads)
- Github Desktop on [Ubuntu](https://www.linuxcapable.com/how-to-install-github-desktop-on-ubuntu-linux/) or [Windows](https://desktop.github.com/)

### Installation Guide

#### Step 1

- Clone the repository using Github Desktop.
- Open the project `openlap-analyticsframework` using IntelliJ IDEA.
- Under the `Project` panel, right-click on the `openlap-analyticsframework`, click `Maven` and then `Reload Project`.
- Right click on the `openlap-analyticsframework` again, and click `Open Module Settings`, click on `Project` tab and check whether `coretto-11` is chosen as the SDK for the project.
  - If not, click on SDK dropdown menu, click `Download SDK`, choose version 11, and then click `Download`.
  - After the download is complete, click `Apply`.
- Under `Project Settings` click on `Modules` tab. Find the directory `resources` under `src>main>resources`. Right click on `resources` and mark as `Resources`
- Right-click on the `openlap-analyticsframework` again, and click `Build Module 'OpenLAP-AnalyticsFramework'` to build the project.
- Click the play button in the top right corner to run the `OpenLAPAnalyticsFrameworkApplication` class to start the server.

#### Step 2

- Use Postman to send a `GET` request to `localhost:8090/AnalyticsEngine/initializeDatabase` to populate the Goals, Analytics Methods, and Visualization
