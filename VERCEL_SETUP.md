# Vercel Configuration Guide

Since the project structure has changed to a **Monorepo** (separate `frontend` and `backend` folders), you must update your Vercel Project Settings for both `edu-sync` and `edusync-backend-api`.

## 1. Fix Frontend Deployment (`edu-sync`)
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Select the **edu-sync** project.
3. Keep going to **Settings** > **General**.
4. Find the **Root Directory** section.
5. Click **Edit** and select `frontend`.
6. Click **Save**.
7. Go to **Deployments** and **Redeploy** the latest commit.

## 2. Fix Backend Deployment (`edusync-backend-api`)
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Select the **edusync-backend-api** project.
3. Keep going to **Settings** > **General**.
4. Find the **Root Directory** section.
5. Click **Edit** and select `backend`.
6. Click **Save**.
7. Go to **Deployments** and **Redeploy** the latest commit.

## Why did it fail?
Previously, Vercel might have been looking at the root or failed because the folders were previously submodules. Now that they are proper folders, Vercel needs to be explicitly told which folder contains which project.
