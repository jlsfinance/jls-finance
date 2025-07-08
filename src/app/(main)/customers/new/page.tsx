
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useRouter } from "next/navigation"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format, parse, isValid } from "date-fns"
import React from "react"
import { useToast } from "@/hooks/use-toast"

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];

const formSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  dob: z.date({
    required_error: "A date of birth is required.",
  }),
  gender: z.string().min(1, { message: "Gender is required." }),
  maritalStatus: z.string().min(1, { message: "Marital status is required." }),
  fatherName: z.string().min(2, { message: "Father's/Spouse's name is required." }),
  address: z.string().min(5, { message: "Please enter a valid address." }),
  city: z.string().min(2, { message: "Please enter a city." }),
  state: z.string().min(2, { message: "Please enter a state." }),
  pincode: z.string().length(6, { message: "Pincode must be a 6-digit number." }),
  mobile: z.string().length(10, { message: "Mobile number must be a 10-digit number." }),
  email: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal('')),
  aadhaar: z.any().optional(),
  pan: z.any().optional(),
  photo: z.any()
    .refine((files) => files?.[0], "Customer photo is required.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 2MB.`)
    .refine(
      (files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Only .jpg, .jpeg, and .png formats are supported."
    ),
});


export default function NewCustomerPage() {
  const { toast } = useToast()
  const router = useRouter();
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      dob: undefined,
      gender: "",
      maritalStatus: "",
      fatherName: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      mobile: "",
      email: "",
      photo: undefined,
    },
  })
  
  const fileRef = form.register('photo');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const photoFile = values.photo[0];
      const photoDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(photoFile);
      });

      const storedCustomers = localStorage.getItem('customers');
      const customers = storedCustomers ? JSON.parse(storedCustomers) : [];
      
      const newIdNumber = (customers.length > 0 ? Math.max(...customers.map((c: any) => parseInt(c.id.replace('CUST', '')))) : 0) + 1;
      const newCustomerId = `CUST${String(newIdNumber).padStart(3, '0')}`;

      const newCustomer = {
        id: newCustomerId,
        name: values.fullName,
        dob: format(values.dob, "yyyy-MM-dd"),
        gender: values.gender,
        maritalStatus: values.maritalStatus,
        fatherName: values.fatherName,
        address: values.address,
        city: values.city,
        state: values.state,
        pincode: values.pincode,
        mobile: values.mobile,
        email: values.email || 'N/A',
        aadhaar: `**** **** ${Math.floor(1000 + Math.random() * 9000)}`,
        pan: `ABCDE${Math.floor(1000 + Math.random() * 9000)}F`,
        status: 'Active',
        photo: photoDataUrl,
      };
      
      const updatedCustomers = [...customers, newCustomer];
      localStorage.setItem('customers', JSON.stringify(updatedCustomers));
      
      toast({
        title: "Customer Registered!",
        description: `Customer ${values.fullName} has been successfully registered.`,
      })
      router.push("/customers");
    } catch(error) {
        console.error("Failed to register customer:", error);
        toast({
            variant: "destructive",
            title: "Registration Failed",
            description: "Could not save the new customer. Please try again.",
        });
    }
  }

  return (
    <div className="flex justify-center items-start py-8">
        <Card className="w-full max-w-4xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">New Customer Registration (KYC)</CardTitle>
            <CardDescription>Complete the following sections to register a new customer.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="personal">Personal Information</TabsTrigger>
                        <TabsTrigger value="contact">Contact Details</TabsTrigger>
                        <TabsTrigger value="documents">Documents & Photo</TabsTrigger>
                    </TabsList>

                    <TabsContent value="personal" className="mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="fullName"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter full name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            <FormField
                                control={form.control}
                                name="dob"
                                render={({ field }) => {
                                    const [dateString, setDateString] = React.useState<string>(
                                        field.value ? format(field.value, 'dd/MM/yyyy') : ''
                                    );
                                
                                    React.useEffect(() => {
                                        if (field.value) {
                                            const formattedDate = format(field.value, 'dd/MM/yyyy');
                                            if (formattedDate !== dateString) {
                                                setDateString(formattedDate);
                                            }
                                        } else {
                                           setDateString("");
                                        }
                                    }, [field.value]);

                                    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                                        const value = e.target.value;
                                        setDateString(value);
                                        if (value.length >= 10) {
                                            const parsedDate = parse(value, 'dd/MM/yyyy', new Date());
                                            if (isValid(parsedDate)) {
                                                field.onChange(parsedDate);
                                            } else {
                                                field.onChange(undefined);
                                            }
                                        }
                                    };

                                    return (
                                    <FormItem>
                                        <FormLabel>Date of Birth</FormLabel>
                                        <Popover>
                                            <div className="relative">
                                                <FormControl>
                                                <Input
                                                    placeholder="DD/MM/YYYY"
                                                    value={dateString}
                                                    onChange={handleInputChange}
                                                />
                                                </FormControl>
                                                <PopoverTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                                                    aria-label="Open calendar"
                                                >
                                                    <CalendarIcon className="h-4 w-4" />
                                                </Button>
                                                </PopoverTrigger>
                                            </div>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={(date) => {
                                                        field.onChange(date);
                                                        if (date) {
                                                            setDateString(format(date, 'dd/MM/yyyy'));
                                                        }
                                                    }}
                                                    disabled={(date) =>
                                                        date > new Date() || date < new Date("1900-01-01")
                                                    }
                                                    defaultMonth={field.value}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                    );
                                }}
                            />
                            <FormField
                                control={form.control}
                                name="gender"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Gender</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Male, Female" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            <FormField
                                control={form.control}
                                name="maritalStatus"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Marital Status</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Single, Married" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            <div className="space-y-2 md:col-span-2">
                                <FormField
                                    control={form.control}
                                    name="fatherName"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Father's/Spouse's Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="contact" className="mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Current Address</FormLabel>
                                        <FormControl>
                                        <Input placeholder="House No, Street" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>City/Town</FormLabel>
                                    <FormControl>
                                    <Input placeholder="Enter city" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="state"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>State</FormLabel>
                                    <FormControl>
                                    <Input placeholder="Enter state" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="pincode"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Pincode</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder="Enter 6-digit pincode" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="mobile"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mobile Number</FormLabel>
                                    <FormControl>
                                    <Input type="tel" placeholder="Enter 10-digit mobile number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email Address (Optional)</FormLabel>
                                    <FormControl>
                                    <Input type="email" placeholder="Enter email address" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="documents" className="mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                          <div className="space-y-6">
                              <FormField
                                  control={form.control}
                                  name="aadhaar"
                                  render={({ field: { onChange, value, ...rest } }) => (
                                      <FormItem>
                                      <FormLabel>Aadhaar Card</FormLabel>
                                      <FormControl>
                                          <Input
                                          type="file"
                                          onChange={(e) =>
                                              onChange(e.target.files ? e.target.files[0] : undefined)
                                          }
                                          {...rest}
                                          />
                                      </FormControl>
                                      <FormDescription>
                                          Upload front and back as a single PDF.
                                      </FormDescription>
                                      <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <FormField
                                  control={form.control}
                                  name="pan"
                                  render={({ field: { onChange, value, ...rest } }) => (
                                      <FormItem>
                                      <FormLabel>PAN Card</FormLabel>
                                      <FormControl>
                                          <Input
                                          type="file"
                                          onChange={(e) =>
                                              onChange(e.target.files ? e.target.files[0] : undefined)
                                          }
                                          {...rest}
                                          />
                                      </FormControl>
                                      <FormMessage />
                                      </FormItem>
                                  )}
                              />
                          </div>
                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name="photo"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Upload Customer Photo</FormLabel>
                                      <FormControl>
                                          <Input 
                                              type="file" 
                                              accept="image/png, image/jpeg, image/jpg"
                                              {...fileRef}
                                              onChange={(event) => {
                                                  field.onChange(event.target.files);
                                                  const file = event.target.files?.[0];
                                                  if (file) {
                                                      const reader = new FileReader();
                                                      reader.onloadend = () => {
                                                          setPhotoPreview(reader.result as string);
                                                      };
                                                      reader.readAsDataURL(file);
                                                  } else {
                                                      setPhotoPreview(null);
                                                  }
                                              }}
                                          />
                                      </FormControl>
                                      <FormDescription>Must be a clear, passport-sized photo. Max 2MB.</FormDescription>
                                      <FormMessage />
                                  </FormItem>
                              )}
                            />
                            {photoPreview && (
                              <div className="flex justify-center items-center p-4 border rounded-md bg-muted/50">
                                  <Image
                                      src={photoPreview}
                                      alt="Customer Photo Preview"
                                      width={150}
                                      height={150}
                                      className="rounded-lg object-cover aspect-square"
                                  />
                              </div>
                            )}
                          </div>
                        </div>
                    </TabsContent>
                    </Tabs>
                    <div className="mt-8 flex justify-end">
                        <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">Register Customer</Button>
                    </div>
                </form>
            </Form>
          </CardContent>
        </Card>
    </div>
  )
}
