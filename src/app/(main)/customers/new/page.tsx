<FormField
  control={form.control}
  name="photo"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Upload Photo *</FormLabel>
      <FormControl>
        <Input
          type="file"
          accept="image/*"
          onChange={(event) => {
            const files = event.target.files;
            form.setValue("photo", files, { shouldValidate: true });
            const file = files?.[0];
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
      <FormDescription>Must be a clear, passport-sized photo. Max 16MB.</FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
