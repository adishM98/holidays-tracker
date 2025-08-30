"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateOfBirthPickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DateOfBirthPicker({
  date,
  onSelect,
  placeholder = "Pick your date of birth",
  className,
  disabled,
}: DateOfBirthPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    date || new Date(2000, 0, 1) // Default to year 2000
  )

  // Sync internal state with prop changes
  React.useEffect(() => {
    setSelectedDate(date)
    if (date) {
      setCurrentMonth(date)
    }
  }, [date])

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i)
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const handleDateSelect = (newDate: Date | undefined) => {
    setSelectedDate(newDate)
    onSelect?.(newDate)
    if (newDate) {
      setOpen(false)
    }
  }

  const handleYearChange = (year: string) => {
    const newMonth = new Date(currentMonth)
    newMonth.setFullYear(parseInt(year))
    setCurrentMonth(newMonth)
  }

  const handleMonthChange = (month: string) => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(parseInt(month))
    setCurrentMonth(newMonth)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          data-empty={!selectedDate}
          className={cn(
            "data-[empty=true]:text-muted-foreground w-[280px] justify-start text-left font-normal",
            className
          )}
        >
          <CalendarIcon />
          {selectedDate ? format(selectedDate, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          disabled={(date) =>
            date < new Date("1900-01-01")
          }
          className="p-3"
          showOutsideDays={false}
          components={{
            Caption: ({ displayMonth }) => (
              <div className="flex items-center justify-between px-2 py-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newMonth = new Date(currentMonth)
                    newMonth.setMonth(newMonth.getMonth() - 1)
                    setCurrentMonth(newMonth)
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center space-x-2">
                  <Select
                    value={currentMonth.getMonth().toString()}
                    onValueChange={handleMonthChange}
                  >
                    <SelectTrigger className="w-[90px] h-8 text-sm border-none shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {month.substring(0, 3)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={currentMonth.getFullYear().toString()}
                    onValueChange={handleYearChange}
                  >
                    <SelectTrigger className="w-[80px] h-8 text-sm border-none shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newMonth = new Date(currentMonth)
                    newMonth.setMonth(newMonth.getMonth() + 1)
                    setCurrentMonth(newMonth)
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )
          }}
        />
      </PopoverContent>
    </Popover>
  )
}