# Hati

Student: YOUR FULL NAME
Course: Integrative Programming and Technologies
Website category: Personal finance and group money (Other)
Live website: PASTE YOUR LIVE URL HERE

## Description

Hati is a website for sharing money fairly in a group. One person, the holder, keeps the record. Friends get a view-only link and always see the same numbers. It has two kinds of group: a Hangout, for trips and nights out where friends take turns paying, and an Ambagan, for group funds such as a class fund. It needs no sign-up and works on phones and computers.

## Main features

- Hangout: add, edit, and remove bills, with an equal split where leftover centavos go to the one who paid
- Settle up: who pays whom, with full or part payments, cancel a payment, and a progress bar
- Where everyone stands: what each person paid, their share, and what they still need to pay or get back
- Next bill suggestion, based on who has covered the least so far
- Ambagan: record payments, track spending, optional goal, and an optional payment schedule where missed amounts add up
- Change history for every group, and an Undo bar after changes
- Edit the group name and people names, and delete a group
- View-only share link, with three privacy choices for an Ambagan: totals only, find my name, or everyone's status
- Friends see a New changes bar, update with one tap, and keep their place on the page
- Peso amounts format as you type, and names and items are capitalized for a consistent look

## Technologies used

HTML, CSS, JavaScript, Local Storage, the Fetch API, Supabase (PostgreSQL with database functions), GitHub Pages

## How it works

Groups are saved in the holder's browser. Pressing Share saves a copy in the Supabase database. The holder's device keeps a private secret, and the database stores only a scrambled copy of it, so only the holder can save changes. Friends open a link that can only read, and their page checks for a newer version every 15 seconds. The server refuses a save if old history entries were changed or removed, or if another device saved first.

## Known limits

- The holder controls the record, so Hati shows every change in a history and does not claim to prevent mistakes
- Anyone with a view link can read that group, so private details should not be put in it
- If the holder clears their browser data, they lose the ability to edit that group
- Find my name is a convenience, not privacy
- The free database plan pauses after a week without use

## Future work

Personal links so friends can send payment claims that the holder confirms, with limits against spam, and a claims window the holder can switch on and off.

## Screenshots

![Home](screenshots/01-home.png)
![New group](screenshots/02-new-group.png)
![Hangout overview](screenshots/03-hangout-overview.png)
![Add a bill](screenshots/04-add-bill.png)
![Bills](screenshots/05-bills.png)
![Settle up](screenshots/06-settle-up.png)
![History](screenshots/07-history.png)
![Ambagan summary](screenshots/08-ambagan-summary.png)
![Ambagan people](screenshots/09-ambagan-people.png)
![Share panel](screenshots/10-share.png)
![View-only page](screenshots/11-view-only.png)
![New changes bar](screenshots/12-new-changes.png)
