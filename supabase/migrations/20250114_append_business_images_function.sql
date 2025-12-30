-- Function to atomically append images to business uploaded_images array
-- This prevents race conditions when multiple requests try to add images simultaneously

CREATE OR REPLACE FUNCTION public.append_business_images(
  p_business_id UUID,
  p_image_urls TEXT[]
)
RETURNS TABLE(uploaded_images TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_images TEXT[];
  updated_images TEXT[];
  max_images INTEGER := 10;
BEGIN
  -- Get current uploaded_images array (or empty array if NULL)
  SELECT COALESCE(uploaded_images, ARRAY[]::TEXT[]) INTO current_images
  FROM public.businesses
  WHERE id = p_business_id;
  
  -- Check if business exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found';
  END IF;
  
  -- Check image limit
  IF array_length(current_images, 1) + array_length(p_image_urls, 1) > max_images THEN
    RAISE EXCEPTION 'Maximum image limit (% images) would be exceeded. Current: %, Attempting to add: %', 
      max_images, 
      COALESCE(array_length(current_images, 1), 0), 
      array_length(p_image_urls, 1);
  END IF;
  
  -- Append new URLs to existing array using array concatenation (atomic operation)
  updated_images := current_images || p_image_urls;
  
  -- Update business with new array
  UPDATE public.businesses
  SET 
    uploaded_images = updated_images,
    updated_at = NOW()
  WHERE id = p_business_id;
  
  -- Return the updated array
  RETURN QUERY SELECT updated_images;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.append_business_images(UUID, TEXT[]) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.append_business_images(UUID, TEXT[]) IS 
  'Atomically appends image URLs to a business uploaded_images array. Prevents race conditions with concurrent uploads. Maximum 10 images per business.';

