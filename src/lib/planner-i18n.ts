import type { Language, PlanWarning, Reason } from "./smart-planner";
export const messages = {
  ru: {
    title: "Умный план", tagline: "Распределите время и оставьте место для отдыха.", local: "Без ИИ · расчёт на устройстве",
    open: "Smart Planner", replan: "Перепланировать день", date: "Дата плана", start: "Начало занятий", end: "Конец занятий",
    nextDay: "Окончание раньше начала — план продолжится на следующий день.", fatigue: "Усталость", low: "Низкая", medium: "Средняя", high: "Высокая",
    fatigueHint: "Низкая: блоки до 60 мин. Средняя: до 30 мин, отдых от 10 мин. Высокая: до 20 мин, отдых от 15 мин, до 60 мин важной учёбы. Фиксированные занятия сохраняются.",
    break: "Перерыв, мин", now: "Текущие дата и время", delay: "Дополнительная задержка, мин", delayHint: "Укажите только время, которое ещё предстоит потратить после указанного текущего времени. Уже прошедшее время повторно не учитывается.",
    tasks: "Учебные задачи", taskHint: "Включены задачи выбранного дня и просроченные. Другие можно выбрать вручную. Дедлайн и дата плана независимы.",
    include: "Включить в план", completed: "Выполнена", duration: "Длительность, мин", priority: "Приоритет", deadline: "Дедлайн", name: "Название задачи",
    mandatory: "Обязательная", split: "Можно разделить", fixed: "Фиксированное занятие", fixedTime: "Фиксированные дата и время", addTask: "Добавить дело", newTask: "Новое дело",
    priorityHigh: "Высокий", priorityMedium: "Средний", priorityLow: "Низкий",
    busy: "Недоступное время", busyName: "Название события", busyStart: "Начало события", busyEnd: "Конец события", addBusy: "Добавить интервал", remove: "Убрать интервал",
    calculate: "Составить план", preview: "Предпросмотр", apply: "Применить план", edit: "Изменить параметры", cancel: "Отмена", close: "Закрыть",
    empty: "Задач пока нет. Добавьте дело здесь или задачу в календаре.", noPlan: "Выберите задачи и время — сначала появится предпросмотр.",
    study: "Учёба", fixedBlock: "Фиксированное занятие", rest: "Перерыв", free: "Свободное время", unavailable: "Личные дела", minutes: "мин",
    remaining: "Не поместилось", moveHint: "Предложение: выделить время на следующую дату. Дедлайн останется прежним. Переносы ниже применяются только при выборе.",
    move: "Поставить остаток на", schedule: "Расписание", noSchedule: "Для этого дня ещё нет сохранённого плана.", deleted: "Задача удалена", saved: "План сохранён", restored: "Восстановлен черновик. Задачи ещё не изменены.",
    storage: "Не удалось сохранить. Освободите место в браузере или экспортируйте данные и повторите.", stale: "Данные изменились после открытия плана. Отмените этот черновик и откройте Smart Planner снова.",
    draftError: "Не удалось сохранить черновик. Не закрывайте страницу до применения или отмены.",
    invalidDraft: "Черновик повреждён. Его копия сохранена, открыты текущие задачи.",
    device: "Данные хранятся в этом браузере. Для другого устройства используйте экспорт/импорт в настройках или существующую облачную синхронизацию.",
    confirm: "До применения задачи, их статусы и расписание не меняются. Остаток задачи не считается выполненным.",
    selected: "Выбрано", overdue: "Просрочено", planned: "Запланировано", settings: "Параметры", noChanges: "Нет задач или событий для сохранения.",
    fixedHint: "Занятие с фиксированным временем резервируется автоматически.",
    transferConflict: "На следующую дату уже есть план. Сначала откройте эту дату и добавьте остаток вручную.",
  },
  en: {
    title: "Smart plan", tagline: "Make room for learning and time to rest.", local: "No AI · calculated on your device",
    open: "Smart Planner", replan: "Replan day", date: "Planning date", start: "Study starts", end: "Study ends",
    nextDay: "An end earlier than the start continues into the next day.", fatigue: "Fatigue", low: "Low", medium: "Medium", high: "High",
    fatigueHint: "Low: blocks up to 60 min. Medium: up to 30 min, breaks of at least 10 min. High: up to 20 min, breaks of at least 15 min, up to 60 min of essential study. Fixed events stay in place.",
    break: "Break, min", now: "Current date and time", delay: "Additional delay, min", delayHint: "Only include time still to be spent after the current time above. Time already elapsed is not counted twice.",
    tasks: "Learning tasks", taskHint: "Tasks due on this day and overdue tasks are selected. You can include other tasks. Deadlines and planning dates are independent.",
    include: "Include in plan", completed: "Completed", duration: "Duration, min", priority: "Priority", deadline: "Deadline", name: "Task title",
    mandatory: "Mandatory", split: "Can be split", fixed: "Fixed event", fixedTime: "Fixed date and time", addTask: "Add a task", newTask: "New task",
    priorityHigh: "High", priorityMedium: "Medium", priorityLow: "Low",
    busy: "Unavailable time", busyName: "Event title", busyStart: "Event starts", busyEnd: "Event ends", addBusy: "Add an interval", remove: "Remove interval",
    calculate: "Generate plan", preview: "Preview", apply: "Apply plan", edit: "Edit parameters", cancel: "Cancel", close: "Close",
    empty: "No tasks yet. Add one here or in the calendar.", noPlan: "Choose tasks and a time window to preview a schedule.",
    study: "Study", fixedBlock: "Fixed event", rest: "Break", free: "Free time", unavailable: "Personal commitment", minutes: "min",
    remaining: "Unscheduled", moveHint: "Suggestion: set aside time on the next date. The deadline stays unchanged. Transfers below apply only when selected.",
    move: "Plan remainder on", schedule: "Schedule", noSchedule: "No saved plan for this day yet.", deleted: "Deleted task", saved: "Plan saved", restored: "Draft restored. Your tasks have not changed yet.",
    storage: "Could not save. Free up browser storage or export your data and try again.", stale: "Data changed after this plan was opened. Cancel this draft and reopen Smart Planner.",
    draftError: "Could not save the draft. Keep this page open until you apply or cancel.",
    invalidDraft: "The draft is damaged. A copy was kept and current tasks were opened.",
    device: "Data is stored in this browser. Use export/import in Settings or your existing cloud sync to move to another device.",
    confirm: "Tasks, statuses and schedules only change after you apply. A task's remainder is not marked complete.",
    selected: "Selected", overdue: "Overdue", planned: "Planned", settings: "Settings", noChanges: "No tasks or events to save.",
    fixedHint: "Fixed events are reserved automatically.",
    transferConflict: "The next date already has a plan. Open that date and add the remainder manually.",
  },
} as const;

const reasons: Record<Reason, [string, string]> = {
  "insufficient-time": ["Недостаточно свободного времени с учётом перерывов. Можно расширить интервал, разрешить разделение или запланировать остаток на другую дату.", "Not enough free time including breaks. Extend the window, allow splitting or plan the remainder on another date."],
  fatigue: ["Ограничение выбранного режима усталости. Можно выбрать другой режим или вернуться к задаче в другой день.", "Limited by the selected fatigue setting. Choose another setting or return to this task on another day."],
  "fixed-outside": ["Фиксированное занятие вне оставшегося времени. Его время сохранено; проверьте дату и границы дня.", "The fixed event is outside the remaining window. Its time is unchanged; check the date and time window."],
  "fixed-conflict": ["Пересечение с другим фиксированным занятием или личным делом. Уточните время вручную.", "Overlaps another fixed event or personal commitment. Adjust the times manually."],
  "invalid-task": ["Некорректные параметры задачи. Проверьте название, дату и длительность.", "Invalid task parameters. Check its title, date and duration."],
};
export function reasonText(reason: Reason, language: Language) { return reasons[reason][language === "ru" ? 0 : 1]; }
export function warningText(warning: PlanWarning, language: Language) {
  const texts: Record<PlanWarning["code"], [string, string]> = {
    overdue: ["Дедлайн уже прошёл. Планирование не меняет срок задачи.", "The deadline has passed. Scheduling does not change the task deadline."],
    "invalid-input": ["Проверьте даты, время и длительность. Начало и конец не должны совпадать.", "Check dates, times and durations. Start and end cannot be equal."],
    "fixed-conflict": ["Устраните пересечение фиксированных событий перед применением.", "Resolve overlapping fixed events before applying."],
    "no-time": ["В указанном интервале не осталось времени.", "No time remains in the selected window."],
    "no-tasks": ["Нет выбранных задач.", "No tasks selected."],
    "all-done": ["Все выбранные задачи выполнены. Можно отдыхать.", "All selected tasks are complete. Time to rest."],
    fatigue: ["Блоки и перерывы адаптированы к выбранной усталости. Длинные неделимые занятия могут остаться без времени.", "Blocks and breaks follow your fatigue setting. Long unsplittable tasks may remain unscheduled."],
  };
  return texts[warning.code][language === "ru" ? 0 : 1];
}
