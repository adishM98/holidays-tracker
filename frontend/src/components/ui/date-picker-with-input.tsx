"use client"

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithInputProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  inputPlaceholder?: string
}

export function DatePickerWithInput({
  date,
  onSelect,
  placeholder = "Pick a date",
  className,
  disabled,
  inputPlaceholder = "MM/dd/yyyy",
}: DatePickerWithInputProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
  const [inputValue, setInputValue] = React.useState<string>(
    date ? format(date, "MM/dd/yyyy") : ""
  )
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    if (date) {
      setSelectedDate(date)
      setInputValue(format(date, "MM/dd/yyyy"))
    }
  }, [date])

  const handleDateSelect = (newDate: Date | undefined) => {
    setSelectedDate(newDate)
    setInputValue(newDate ? format(newDate, "MM/dd/yyyy") : "")
    onSelect?.(newDate)
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    
    if (value.length === 10) { // MM/dd/yyyy format
      const parsedDate = parse(value, "MM/dd/yyyy", new Date())
      if (isValid(parsedDate)) {
        setSelectedDate(parsedDate)
        onSelect?.(parsedDate)
      }
    } else if (value === "") {
      setSelectedDate(undefined)
      onSelect?.(undefined)
    }
  }

  const handleInputBlur = () => {
    if (selectedDate && inputValue) {
      setInputValue(format(selectedDate, "MM/dd/yyyy"))
    }
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        placeholder={inputPlaceholder}
        disabled={disabled}
        className="w-[140px]"
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            size="icon"
            className="shrink-0"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}