ENV["RAILS_ENV"] ||= "test"
abort "Run specs with RAILS_ENV=test" unless ENV["RAILS_ENV"] == "test"

require_relative "../config/environment"
require "rspec/rails"
require_relative "support/request_helpers"

ActiveRecord::Migration.maintain_test_schema!

RSpec.configure do |config|
  config.use_transactional_fixtures = true
  config.include RequestHelpers, type: :request
end
