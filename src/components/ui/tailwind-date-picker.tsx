"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"

interface TailwindDatePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function TailwindDatePicker({
  date,
  onSelect,
  placeholder = "Select date",
  className = "",
  disabled = false,
}: TailwindDatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [currentMonth, setCurrentMonth] = React.useState(date || new Date())
  
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  
  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
  
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 50 + i)
  
  // Get days in current month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }
  
  const handleDateClick = (clickedDate: Date) => {
    onSelect?.(clickedDate)
    setIsOpen(false)
  }
  
  const handleMonthChange = (newMonth: number) => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newMonth)
    setCurrentMonth(newDate)
  }
  
  const handleYearChange = (newYear: number) => {
    const newDate = new Date(currentMonth)
    newDate.setFullYear(newYear)
    setCurrentMonth(newDate)
  }
  
  const goToPreviousMonth = () => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newDate.getMonth() - 1)
    setCurrentMonth(newDate)
  }
  
  const goToNextMonth = () => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newDate.getMonth() + 1)
    setCurrentMonth(newDate)
  }
  
  const isSelectedDate = (checkDate: Date) => {
    if (!date) return false
    return (
      checkDate.getDate() === date.getDate() &&
      checkDate.getMonth() === date.getMonth() &&
      checkDate.getFullYear() === date.getFullYear()
    )
  }
  
  const isToday = (checkDate: Date) => {
    const today = new Date()
    return (
      checkDate.getDate() === today.getDate() &&
      checkDate.getMonth() === today.getMonth() &&
      checkDate.getFullYear() === today.getFullYear()
    )
  }
  
  const days = getDaysInMonth(currentMonth)
  
  return (
    <div key="tailwind-datepicker-v2" className={`relative ${className}`}>
      {/* Input Field */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 justify-between items-center text-left"
      >
        <div className="flex items-center">
          <CalendarIcon className="h-4 w-4 text-muted-foreground mr-2" />
          <span className={date ? "text-foreground" : "text-muted-foreground"}>
            {date ? format(date, "MMM d, yyyy") : placeholder}
          </span>
        </div>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transform transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      
      {/* Calendar Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-popover border border-border rounded-md shadow-md p-4 min-w-[280px]">
          {/* Month/Year Selectors */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <select
                value={currentMonth.getMonth()}
                onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                className="px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 bg-background text-foreground"
              >
                {months.map((month, index) => (
                  <option key={month} value={index}>
                    {month}
                  </option>
                ))}
              </select>
              
              <select
                value={currentMonth.getFullYear()}
                onChange={(e) => handleYearChange(parseInt(e.target.value))}
                className="px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 bg-background text-foreground"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={goToPreviousMonth}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-500 text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goToNextMonth}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-500 text-muted-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {daysOfWeek.map((day) => (
              <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {days.map((day, index) => (
              <div key={index} className="p-1">
                {day ? (
                  <button
                    type="button"
                    onClick={() => handleDateClick(day)}
                    className={`
                      w-8 h-8 rounded text-sm font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-gray-500
                      ${isSelectedDate(day)
                        ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300'
                        : isToday(day)
                        ? 'bg-gray-100 dark:bg-gray-800 text-foreground hover:bg-gray-200 dark:hover:bg-gray-700'
                        : 'text-foreground hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    {day.getDate()}
                  </button>
                ) : (
                  <div className="w-8 h-8"></div>
                )}
              </div>
            ))}
          </div>
          
          {/* Close button */}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 text-sm text-muted-foreground hover:text-gray-800 dark:hover:text-gray-200 focus:outline-none"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Overlay to close calendar when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}