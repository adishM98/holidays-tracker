import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { DateOfBirthPicker } from "@/components/ui/date-of-birth-picker"
import { DatePickerWithInput } from "@/components/ui/date-picker-with-input"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { Separator } from "@/components/ui/separator"

export function DatePickerDemo() {
  const [basicDate, setBasicDate] = React.useState<Date>()
  const [birthDate, setBirthDate] = React.useState<Date>()
  const [inputDate, setInputDate] = React.useState<Date>()
  const [dateTime, setDateTime] = React.useState<Date>()

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Date Picker Components</h1>
        <p className="text-muted-foreground mt-2">
          A collection of date picker components built with shadcn/ui
        </p>
      </div>
      
      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Date Picker</CardTitle>
            <CardDescription>
              A simple date picker with calendar dropdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DatePicker
              date={basicDate}
              onSelect={setBasicDate}
              placeholder="Select a date"
            />
            {basicDate && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {basicDate.toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Date of Birth Picker</CardTitle>
            <CardDescription>
              Optimized for selecting birth dates with year/month navigation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DateOfBirthPicker
              date={birthDate}
              onSelect={setBirthDate}
              placeholder="Select your date of birth"
            />
            {birthDate && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {birthDate.toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Picker with Input</CardTitle>
            <CardDescription>
              Date picker with manual input field (MM/dd/yyyy format)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DatePickerWithInput
              date={inputDate}
              onSelect={setInputDate}
              inputPlaceholder="MM/dd/yyyy"
            />
            {inputDate && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {inputDate.toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Date and Time Picker</CardTitle>
            <CardDescription>
              Complete date and time selection with AM/PM
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DateTimePicker
              date={dateTime}
              onSelect={setDateTime}
              placeholder="Pick date and time"
            />
            {dateTime && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {dateTime.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}