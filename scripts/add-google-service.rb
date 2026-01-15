#!/usr/bin/env ruby
require 'xcodeproj'

# Define paths
project_path = 'ios/App/App.xcodeproj'
file_name = 'GoogleService-Info.plist'
file_path = "ios/App/App/#{file_name}"

puts "🚀 Starting Xcode project patch for #{file_name}..."

# Open the project
project = Xcodeproj::Project.open(project_path)

# Find the main target
target = project.targets.find { |t| t.name == 'App' }

if target.nil?
  puts "❌ Error: Target 'App' not found!"
  exit 1
end

# Get the 'App' group (where source files are)
app_group = project.main_group['App']

if app_group.nil?
  puts "❌ Error: 'App' group not found in project!"
  exit 1
end

# check if file reference already exists
file_ref = app_group.files.find { |f| f.path == file_name }

if file_ref
  puts "ℹ️  File reference already exists in project."
else
  # Create file reference
  file_ref = app_group.new_reference(file_name)
  puts "✅ Created file reference for #{file_name}."
end

# Check if it's in the Copy Bundle Resources phase
resources_phase = target.resources_build_phase
if resources_phase.files_references.include?(file_ref)
  puts "ℹ️  File is already in 'Copy Bundle Resources' phase."
else
  resources_phase.add_file_reference(file_ref)
  puts "✅ Added #{file_name} to 'Copy Bundle Resources' phase."
end

# Save the project
project.save
puts "🎉 Project saved successfully!"
