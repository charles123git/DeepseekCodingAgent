# Setting Up GitHub Repository - Step by Step Guide

## 1. Create a New GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" button in the top-right corner
3. Select "New repository"

![New Repo Button](https://docs.github.com/assets/cb-11427/mw-1440/images/help/repository/repo-create.webp)

## 2. Configure Repository Settings

Fill in the following information:
- Repository name: `deepseek-coding-agent`
- Description: "A cost-effective multimodal AI coding agent platform using DeepSeek API"
- Choose "Public" repository
- Do NOT initialize with:
  - README (we already have one)
  - .gitignore (we already have one)
  - License (we can add it later)

![Repository Settings](https://docs.github.com/assets/cb-61138/mw-1440/images/help/repository/create-repository-name.webp)

## 3. Click "Create repository"

After creation, GitHub will show you commands to use. We'll use these in the next step.

## 4. Link Your Replit Project

Once you have the repository URL (it will look like `https://github.com/yourusername/deepseek-coding-agent.git`), follow these steps:

1. In your Replit project, click on the "Shell" tab
2. Run these commands (replace the URL with your repository URL):
   ```bash
   git remote add origin https://github.com/yourusername/deepseek-coding-agent.git
   git branch -M main
   git push -u origin main
   ```

## 5. Authentication

- GitHub will ask for your username and password
- For the password, you'll need to use a Personal Access Token
  1. Go to GitHub Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
  2. Generate a new token with 'repo' access
  3. Copy the token and use it as your password when pushing

## That's it! 

Your code is now on GitHub and you can:
- Clone it for future projects
- Share it with others
- Track changes and collaborate

Would you like me to help you with any of these steps?
