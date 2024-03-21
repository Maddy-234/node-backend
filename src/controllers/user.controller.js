import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  //get the user details from frontend
  const { fullname, email, username, password } = req.body;
  console.log("email:", email);
  //validation - not empty
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  //check if the user already exists: username and email
  const existingUser = User.findOne({
    $or: [{ username: username }, { email: email }],
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }
  //check for images, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }
  //upload them to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar upload failed");
  }

  //create user object - create entry in database
  const user = await User.create({
    fullname,
    email,
    username: username.toLowerCase(),
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  //remove password and refresh token field from response
  const userCreated = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //check user creation
  if (!userCreated) {
    throw new ApiError(500, "User creation failed");
  }
  //return response
  return res
    .status(201)
    .json(new ApiResponse(200, userCreated, "User registered successfully"));
});

export { registerUser };
