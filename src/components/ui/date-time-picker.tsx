"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

interface DateTimePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DateTimePicker({
  date,
  onSelect,
  placeholder = "Pick date and time",
  className,
  disabled,
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
  const [isOpen, setIsOpen] = React.useState(false)

  // Extract hours, minutes, and AM/PM from the current date
  const [hours, setHours] = React.useState<string>(
    date ? (date.getHours() % 12 || 12).toString() : "12"
  )
  const [minutes, setMinutes] = React.useState<string>(
    date ? date.getMinutes().toString().padStart(2, "0") : "00"
  )
  const [ampm, setAmpm] = React.useState<string>(
    date ? (date.getHours() >= 12 ? "PM" : "AM") : "AM"
  )

  React.useEffect(() => {
    if (date) {
      setSelectedDate(date)
      setHours((date.getHours() % 12 || 12).toString())
      setMinutes(date.getMinutes().toString().padStart(2, "0"))
      setAmpm(date.getHours() >= 12 ? "PM" : "AM")
    }
  }, [date])

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      // Preserve the time when selecting a new date
      const updatedDate = new Date(newDate)
      const hourValue = parseInt(hours) % 12 + (ampm === "PM" ? 12 : 0)
      const hourAdjusted = hourValue === 12 && ampm === "AM" ? 0 : hourValue === 0 && ampm === "PM" ? 12 : hourValue
      updatedDate.setHours(hourAdjusted, parseInt(minutes), 0, 0)
      setSelectedDate(updatedDate)
      onSelect?.(updatedDate)
      // Don't close immediately - let user set time first
    } else {
      setSelectedDate(undefined)
      onSelect?.(undefined)
      setIsOpen(false)
    }
  }

  const handleTimeChange = () => {
    if (selectedDate) {
      const updatedDate = new Date(selectedDate)
      const hourValue = parseInt(hours) % 12 + (ampm === "PM" ? 12 : 0)
      const hourAdjusted = hourValue === 12 && ampm === "AM" ? 0 : hourValue === 0 && ampm === "PM" ? 12 : hourValue
      updatedDate.setHours(hourAdjusted, parseInt(minutes), 0, 0)
      setSelectedDate(updatedDate)
      onSelect?.(updatedDate)
    }
  }

  React.useEffect(() => {
    handleTimeChange()
  }, [hours, minutes, ampm])

  const formatDateTime = (date: Date) => {
    return format(date, "PPP 'at' h:mm a")
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          data-empty={!selectedDate}
          className={cn(
            "data-[empty=true]:text-muted-foreground w-[300px] justify-start text-left font-normal",
            className
          )}
        >
          <CalendarIcon />
          {selectedDate ? (
            formatDateTime(selectedDate)
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
          />
          <div className="mt-3 border-t pt-3">
            <Label className="text-sm font-medium">Time</Label>
            <div className="flex items-center space-x-2 mt-2">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Select value={hours} onValueChange={setHours}>
                  <SelectTrigger className="w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                      <SelectItem key={hour} value={hour.toString()}>
                        {hour.toString().padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">:</span>
                <Select value={minutes} onValueChange={setMinutes}>
                  <SelectTrigger className="w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                      <SelectItem key={minute} value={minute.toString().padStart(2, "0")}>
                        {minute.toString().padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={ampm} onValueChange={setAmpm}>
                  <SelectTrigger className="w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <Button 
                size="sm" 
                onClick={() => setIsOpen(false)}
                disabled={!selectedDate}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}