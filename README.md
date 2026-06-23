# Online Quiz Platform

University MVP project — Group 1.

A role-based quiz platform where teachers create quizzes, students take them, the system auto-grades, and an admin oversees users.

## Team

- Nikoloz Todua — Backend, authentication, REST API, integration
- Iakobi Gogebashvili — Frontend, React pages, UI
- Luka Bakhturidze - Backend(authentication), quizzes api, Frontend(react components)

## Tech stack

- Frontend: React 18, Vite, React Router v6, CSS Modules, axios
- Backend: Node.js, Express, MongoDB/Mongoose, JWT, bcryptjs
- Database: MongoDB

## Features

- Login / Register
- Teacher dashboard
- Student dashboard
- Quiz creation
- Quiz solving
- Automatic grading
- Admin panel

## Status

In development.

## start mongodb database

docker compose up -d mongodb

## stop the database

docker compose down

## stop the database including volume

docker compose down -v
