require "rails_helper"

RSpec.describe "API setup", type: :request do
  it "reports a healthy application" do
    get "/up"

    expect(response).to have_http_status(:success)
  end

  %w[http://127.0.0.1:5173 http://localhost:5173].each do |origin|
    it "accepts API preflight requests from #{origin}" do
      options "/api/projects", headers: preflight_headers(origin)

      expect(response).to have_http_status(:success)
      expect(response.headers["Access-Control-Allow-Origin"]).to eq(origin)
    end
  end

  it "does not grant CORS access to unrelated origins" do
    options "/api/projects", headers: preflight_headers("https://example.invalid")

    expect(response.headers["Access-Control-Allow-Origin"]).to be_nil
  end

  it "stores and retrieves blobs on disk" do
    data = "test audio data"
    blob = ActiveStorage::Blob.create_and_upload!(
      io: StringIO.new(data),
      filename: "example.wav",
      content_type: "audio/wav",
      identify: false
    )

    expect(blob.download).to eq(data)
  ensure
    blob&.purge
  end

  private

  def preflight_headers(origin)
    { "Origin" => origin, "Access-Control-Request-Method" => "POST" }
  end
end
