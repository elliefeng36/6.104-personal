# Personal Project Design Document

## Problem Framing

### Problem Statement

#### Domain

The human life has become continuously more and more convoluted and jam-packed ever since we invented the steam engine, and this is possibly best exemplified in the Google Calendar of an MIT student. Where it was once possible, maybe in middle or high school, to make classes and homework the main priority of someone's life, students now have to juggle an already heavy academic workload with one or multiple jobs, research, extracurriculars, feeding and grooming oneself, having a social life, keeping house, and the other minutiae that come with MIT life. While remembering exams and club meetings and big deadlines is not very difficult, smaller tasks tend to slip through the cracks, either pushed back indefinitely or forgotten altogether. As an example, the unscheduled tasks I had to do on Sept. 10th were to read through my syllabi and take note of exam dates, visit the post office to send out a birthday card, go to the library to check out a keyboard for my music class, register to vote, pick up two packages, order Doordash for a club event, and schedule an interview.

Though it would be possible for many MIT students to be significantly less busy, by dropping clubs or taking less classes for instance, we continue on this way because the MIT population was selected to be highly driven and ambitious. So, most students take to calendars, schedules, and lists to keep track of what to do. However, this still results in some major gaps, as described below. My goals for this domain are not to try and make MIT students less busy, which is a fruitless cause, but to make a solution that will help them keep track of the small, quick, and often recurring tasks that are either easily forgotten or that build up to create stress and an inability to decide what to do next.

#### Bad situations

1. People often forget to do small tasks. These are tasks that are too minute to be scheduled, such as retrieving a package from desk or responding to a message on Slack, as opposed to schedulable tasks, like going to the grocery store or collaborating on a pset. Since people often look to their calendars for what to do, these tasks slip through the cracks.

2. Many small tasks, such as sweeping or throwing out expired food, need to happen regularly. I will call these recurring tasks. Remembering to do recurring tasks or writing them down is a constant tiny burden. After all, writing down that you need to wipe down the sink every two weeks takes nearly as much time (finding a pencil and paper or the notes in your phone, writing out the words, putting it somewhere you'll see it) as the task itself. So, people are forced to either take time on the small task of writing down another small task or carry the mental load of remembering every recurring task.

3. Whenever someone has free time, they are frozen when trying to decide what to do. I will call this decision overload, which is a combination of decision fatigue and decision paralysis that is unique to everyone. Decision overload happens both when someone wants to use that free time productively or for leisure. In the first case, there may be too many small tasks (as described above) to do that a person simply forgets all of them, or too many competing deadlines that quickly become overwhelming to sort out. In the latter situation, there are so many ways to relax--a book, movie, hobby, nap, side project, etc--that too often people end up on an easy dopamine hit like Instagram that they later regret.

#### Corroboration

There are many, many products marketed towards students to help them plan and manage their daily life. Recently, Google Gemini has been doing a large advertising push towards college students, with messaging emphasizing Gemini's ability to help meal prep, schedule out time for the gym, or suggest things to do for fun. Google obviously sees this as a huge market, which strongly implies that students are overwhelmed by such daily tasks and that there is not yet a broadly working solution.

As for bad situation #3, one of the phenomenons that contribute to it is decision fatigue. A search on Google Scholar for "decision fatigue in students" reveals hundreds of thousands of articles, with one highly relevant paper being published in 2026 suggesting that this is still a major problem. A similar search resulted in recent articles on decision paralysis in college students as well. The short-form content epidemic that is pervasive among college students in the U.S. is in part aggrieved by decision fatigue. After a long day of deciding what to do with every crumb of free time you have, the easiest way to relax is not to choose what interesting and fulfilling hobby to do next--it is to open the easiest app on your phone and watch videos that are fed to you. You never have to choose what to look at next, which is why it is so easy and appealing to college students.

#### Workarounds and comparables

**Calendars:** Most students use some sort of calendar, often Google Calendar, in order to block out classes, clubs, and other events. Many also block out time for various errands and work, such as an hour for working on a UROP or getting dinner with a friend. However, for tasks that take five to ten minutes, minutely scheduling them onto a calendar makes it unreadable at best and is actively unhelpful at worst--after all, if you miss your ten minute slot to respond to an email, you'd have to reschedule it to another time slot, and the email might take more than ten minutes to respond to, which cascades into your next small task.

**Post-it notes:** This is a long-standing solution--physical notes that you can stick next to whatever needs to be done to jog your memory. The biggest issue with this solution is how hard it is to make one. After thinking of something, you'd need to find a pencil, retrieve your stack of post-it notes, write down the task, and then physically go to the relevant place and stick the note there. This is easy if you're indexing your fridge and sticking your grocery list on its door, but if you run into a friend in class and get reminded of the cookies you need to buy for her party there, you'd either have to hang on to a small slip of paper for a long time or just remember to add cookies to the list once you get home, creating yet another small task to keep track of.

**Digital to-do lists:** A digital to-do list, such as one on your phone, is likely the best solution to having many small things to do. It's always on you, and it's convenient to add to. However, it doesn't take care of big problem #3, as at any free moment, you'd need to consult a likely long list and decide which item to complete. It also can't fully address big problem #2, as you'd either have to keep recurring tasks on the to-do list even when they're not relevant, or keep deleting and readding them, which takes mental load.

**AI assistants:** This is a very new solution, so it remains to be seen how useful it might be at solving these bad situations. Though these AI assistants can remove much of the burden of choice, you do still have to prompt them, which still takes effort. Furthermore, they are still prone to hallucinations and reaching token capacity, which may cause them to give you bogus unneeded tasks to do or forget longstanding recurring tasks.

#### Solution sketch

A proposal for a solution would be a task tracker that suggests tasks or activities to do. By being digital and accessible on one's phone, one can quickly write down items that need to be done, giving this solution the strengths of the digital to-do list. However, when creating a task, users can also make it recurring, which removes the burden of remembering to add a repeating task back onto a to-do list. Lastly, users would also be able to make an estimate at how long a task might take when jotting it down. Then, when a user has free time, they can tell this app how much time they have, and it will suggest tasks to be done, removing a large amount of the decision fatigue that comes with deciding what to do from a long list of items. Thus, my proposed solution takes the best parts of to-do lists and patches the bad situations that can't be fixed by a plain to-do list.

## Application Pitch

### Taskmaster

#### Motivation

Keeping your life together is really hard--whether it's to-do lists that grow unwieldy on paper or kept in your (often too forgetful) brain, the admin overhead of readding those tasks that keep popping up, or staring at that list when you finally have free time and not knowing where you could possibly start--but Taskmaster, where adding tasks is quick and simple, recurring tasks readd themselves to your list instantly, and suggested tasks give you an easier way to start getting things done, makes life much simpler.

#### Features

**Quick Add:** If you're on the run and just remembered something you need to do, you can quickly and easily add your task with just a name. But when you get a chance to breathe, you can go back and mark whether the task is recurring, add deadlines, and input the estimated time needed to finish the task.

**Auto-recurring Tasks:** You no longer need to remember to keep adding that pesky chore to your to-do list--mark it as recurring, set a custom period, and watch as that task automatically reappears on your to-do list right when you need to remember it.

**Task Suggest:** If you have a chunk of free time, you won't have to stare at your giant list of tasks, overwhelmed by decisions. This feature eliminates decisions altogether, and suggests a task with an upcoming deadline that fits the amount of time you have, so that you don't waste your precious free moments paralyzed.

#### Concepts

### TaskListing

**concept** TaskListing [Task]

**purpose** Keeps track of a list of active tasks that users can add, delete, or complete so users can see what needs to be done. Also keeps a list of completed tasks so users can check to see if they've finished a task.

**principle** starting with an empty TaskList, users can add active tasks at any time; they can delete any active tasks; they can also mark active tasks as completed.

**state**

A set of Users with

- a TaskList

A set of TaskLists with

- an owner User
- an activeTasks set of Tasks
- a completedTasks set of Tasks

**actions**

addTask (owner: User, task: Task) **where** owner is in the set of Users **then** add the task to user's activeTasks.

deleteTask (owner: User, task: Task) **where** owner is in the set of Users and task is in owner's activeTasks **then** remove that task from owner's activeTasks.

completeTask (owner: User, task: Task) **where** owner is in the set of Users and task is in owners activeTasks **then** remove that task from owner's activeTasks and add it to owner's completedTasks.

\_viewTasks (owner: user) : (taskList: TaskList) **where** owner is in the set of Users **then** return owner's TaskList.

### TaskSetting

**concept** TaskSetting

**purpose** Allows users to create and update tasks, either because they didn't add all the information intially or because circumstances for the task have changed

**principle** A user can create a task with a name and optionally a deadline, estimated duration of the task, whether it's recurring, and if so, how long the recurring period is; later, the user can set and update these fields.

**state**

A set of Tasks with

- an owner User
- a name String
- a hasDeadline Flag
- an optional deadline Date
- an optional duration Number
- an isRecurring Flag
- an option recurringPeriod Number

**actions**

makeTask (owner: User, name: String, deadline?: Date, duration?: Number, recurringPeriod?: Number) : (task: Task) **where** name is nonempty, deadline, if given, is in the future, duration, if given, is nonnegative, and recurringPeriod, if given, is positive **then** create a new Task with owner and name, and deadline, duration, and recurringPeriod, if they are given. If deadline is given, set the new Task's hasDeadline to True, and False otherwise. If recurringPeriod is given, set the new Task's isRecurring to True, otherwise, set it to False. Return the newly created Task.

setDeadline (task: Task, deadline: Date) **where** task is in the set of Tasks and deadline is in the future **then** set task's deadline to the given deadline and set its hasDeadline to True if it isn't already.

removeDeadline (task: Task) **where** task is in the set of Tasks **then** set task's hasDeadline to False.

setDuration (task: Task, duration: Number) **where** task is in the set of Tasks and duration is nonnegative **then** set task's duration to the given duration.

startRecurring (task: Task, recurringPeriod: Number) **where** task is in the set of Tasks and recurringPeriod is positive **then** set task's recurringPeriod to the given recurringPeriod and set its isRecurring to True if it isn't already.

stopRecurring (task: Task) **where** task is in the set of Tasks **then** set task's isRecurring to False.

### TaskSuggesting

**concept** TaskSuggesting

**purpose** Removes decision overloading by suggesting tasks to users based on upcoming deadlines and an optional time constraint.

**principle** a user can make a request for a task suggestion with an optional time limit; then, a task matching the requirements is returned.

**state**

A set of SuggestRequests with

- a User
- an optional timeLimit Number

**actions**

makeRequest (user: User, timeLimit?: Number) : (request: SuggestRequest) **where** timeLimit is nonnegative **then** creates a SuggestRequest with that user and timeLimit and returns it.

makeSuggestion (request: SuggestRequest, taskList: TaskList) : (task: Task) **where** the taskList's activeTasks is not empty **then** generates a suggested task from the taskList's activeTasks based on upcoming deadlines and whether the request has a timeLimit and returns the task.

### reactions

**reaction** addNewTask
**when** TaskSetting.makeTask(owner) : (task)
**then** TaskListing.addTask(owner, task)

**reaction** addRecurringTask
**when** Requesting.taskTimeElapsed(owner, task)
**then** TaskListing.addTask(owner, task)

**reaction** generateSuggestion
**when** TaskSuggesting.makeRequest(user) : (request)
**then** TaskListing.\_viewTasks(owner: user) : (taskList); TaskSuggesting.makeSuggestion(request, taskList)

### notes

When a new User is created (such as making an account), an empty TaskList with that user as its Owner and empty activeTasks and completedTasks lists is instantiated and set as that user's TaskList. I am currently envisioning duration and recurringPeriod as time counted in minutes, although in the user interfacing part of the app, units would show as days/weeks/months etc. as appropriate. Requesting.taskTimeElapsed triggers every time a recurring task's recurringPeriod has elapsed.

## UI Layout

![Wireframe](P1\wireframe.jpg)

## User journey

As Alice, a student at MIT, is walking to class one morning, she sneezes from the pollen in the air and distantly remembers that she's out of allergy medicine and should get more. Usually, this is the kind of brief thought that slips out of her mind quickly, resulting in half an allergy season's worth of sneezing and sniffling before Alice finally remembers this strongly enough to actually buy the medicine. But with Taskmaster, Alice quickly pulls out her phone and types in "get allergy meds!!" into the Name field in the Add input box. She's a bit late to class, so she doesn't pause to fill in the rest of the fields.

During lunch, Alice takes a glance at her tasklist on Taskmaster, and sees that she hasn't finished filling out the information for the allergy meds task. She could leave it blank, and it would work just fine, but Alice takes a few seconds to set an estimated duration of half an hour for the walk to Target and a deadline of Sunday so that she can have her medicines before the worst of the pollen starts. At lunch, her friend Bob sits down across from her. They start talking about a club they're both in, and specifically, the monthly social that's coming up. Alice just got elected social co-chair, and though most of the work is done, she realizes she needs to buy snacks and drinks for the social every month. So, she opens Taskmaster, adds the task, and sets it to recur monthly. Now, instead of trying to remember to do something once a month, which, from her experience, tends to go very poorly while also stressing her out, Alice will see her reminder to get social supplies reappear every month without her having to do anything.

After lunch, Alice has twenty minutes with nothing on her calendar. She could study, but she's on top of all her classes, and she wants to get something useful done. When she opens her tasklist on Taskmaster, she immediately feels inundated by the list of things she has to do. But instead of getting paralyzed trying to figure out whether she should email her UROP advisor, schedule a vaccination, clean her room, or apply to a job, she tells Taskmaster how much time she has and asks it to suggest something. Looks like she'll be drafting an email before her next class instead of getting hit by the fatigue of being unable to decide and ultimately doing nothing productive instead.
